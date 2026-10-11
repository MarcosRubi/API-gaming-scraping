import { Injectable } from '@nestjs/common';
import { ConcurrencyLimiter, TtlCache } from '../../common/http/concurrency';
import { fetchJson, urlExists } from '../../common/http/http.utils';
import { AppConfigService } from '../../config/app-config.service';
import type {
    SteamAppData,
    SteamFeatured,
    SteamFeaturedCategories,
    SteamNewsRaw,
    SteamPriceOverview,
    SteamReviewSummary,
} from './steam.types';

const STORE = 'https://store.steampowered.com';
const ASSETS = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps';
const TIMEOUT_MS = 8000;
const HOUR = 60 * 60 * 1000;

// Cliente de las APIs JSON públicas de Steam (sin key). Todo lo que es
// estable (fichas, reseñas, existencia de imágenes) se cachea en memoria y
// las llamadas pasan por un limitador para no comerse un 429.
@Injectable()
export class SteamApiClient {
    private readonly limiter = new ConcurrencyLimiter(3);
    private readonly details = new TtlCache<SteamAppData | null>(12 * HOUR);
    private readonly reviews = new TtlCache<SteamReviewSummary | null>(24 * HOUR);
    private readonly assets = new TtlCache<boolean>(24 * HOUR);

    constructor(private readonly config: AppConfigService) {}

    private get region(): string {
        return `cc=${this.config.get('STEAM_COUNTRY')}&l=${this.config.get('STEAM_LANGUAGE')}`;
    }

    private get<T>(url: string): Promise<T | null> {
        return this.limiter.run(() => fetchJson<T>(url, TIMEOUT_MS));
    }

    featuredCategories(): Promise<SteamFeaturedCategories | null> {
        return this.get(`${STORE}/api/featuredcategories?${this.region}`);
    }

    featured(): Promise<SteamFeatured | null> {
        return this.get(`${STORE}/api/featured?${this.region}`);
    }

    async appDetails(appId: string): Promise<SteamAppData | null> {
        const cached = this.details.get(appId);
        if (cached !== undefined) return cached;
        const json = await this.get<Record<string, { success: boolean; data?: SteamAppData }>>(
            `${STORE}/api/appdetails?appids=${appId}&${this.region}`,
        );
        const data = json?.[appId]?.success ? (json[appId].data ?? null) : null;
        // Un fallo (red, 429) se recuerda poco tiempo para reintentar pronto.
        this.details.set(appId, data, data ? undefined : 10 * 60 * 1000);
        return data;
    }

    // Precios de varias apps en una sola llamada (solo admite este filtro).
    // null = la llamada falló (≠ un juego sin precio, que es gratis).
    async prices(appIds: string[]): Promise<Record<string, SteamPriceOverview | null> | null> {
        if (appIds.length === 0) return {};
        const url = `${STORE}/api/appdetails?appids=${appIds.join(',')}&filters=price_overview&${this.region}`;
        type Batch = Record<string, { success: boolean; data?: { price_overview?: SteamPriceOverview } | [] }>;
        let json = await this.get<Batch>(url);
        if (!json) {
            // Suele ser un 429 momentáneo: un reintento después de una pausa.
            await new Promise((resolve) => setTimeout(resolve, 3000));
            json = await this.get<Batch>(url);
        }
        if (!json) return null;
        const out: Record<string, SteamPriceOverview | null> = {};
        for (const id of appIds) {
            const data = json?.[id]?.data;
            out[id] = data && !Array.isArray(data) ? (data.price_overview ?? null) : null;
        }
        return out;
    }

    // Búsqueda por etiqueta (género). La respuesta solo trae nombre y una
    // imagen cuya URL contiene el appid.
    async searchByTag(tagId: number, count: number): Promise<{ appId: string; name: string }[]> {
        const json = await this.get<{ items?: { name: string; logo: string }[] }>(
            `${STORE}/search/results/?query&start=0&count=${count}&tags=${tagId}&category1=998&json=1&${this.region}`,
        );
        return (json?.items ?? [])
            .map((item) => ({ name: item.name, appId: item.logo.match(/\/apps\/(\d+)\//)?.[1] ?? '' }))
            .filter((item) => item.appId);
    }

    async storeSearch(term: string): Promise<{ id: number; name: string }[]> {
        const json = await this.get<{ items?: { id: number; name: string }[] }>(
            `${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&${this.region}`,
        );
        return json?.items ?? [];
    }

    async reviewSummary(appId: string): Promise<SteamReviewSummary | null> {
        const cached = this.reviews.get(appId);
        if (cached !== undefined) return cached;
        const json = await this.get<{ query_summary?: SteamReviewSummary }>(
            `${STORE}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
        );
        const summary = json?.query_summary ?? null;
        this.reviews.set(appId, summary, summary ? undefined : 10 * 60 * 1000);
        return summary;
    }

    async news(appId: string, count: number): Promise<SteamNewsRaw[]> {
        const json = await this.get<{ appnews?: { newsitems?: SteamNewsRaw[] } }>(
            `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=280&feeds=steam_community_announcements`,
        );
        return json?.appnews?.newsitems ?? [];
    }

    assetUrl(appId: string, file: string): string {
        return `${ASSETS}/${appId}/${file}`;
    }

    // ¿Existe el asset? (library_hero / logo no están en todos los juegos).
    async assetExists(url: string): Promise<boolean> {
        const cached = this.assets.get(url);
        if (cached !== undefined) return cached;
        const exists = await this.limiter.run(() => urlExists(url, TIMEOUT_MS));
        this.assets.set(url, exists);
        return exists;
    }
}
