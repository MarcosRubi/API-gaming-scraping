import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConcurrencyLimiter, TtlCache } from '../../common/http/concurrency';
import { fetchJson, urlExists } from '../../common/http/http.utils';
import { readJsonFile, writeJsonFile } from '../../common/storage/json-file';
import { dataPath } from '../../common/storage/paths';
import { AppConfigService } from '../../config/app-config.service';
import type { GameArt } from '../../common/types/game.types';
import type {
    SteamAppData,
    SteamFeatured,
    SteamFeaturedCategories,
    SteamNewsRaw,
    SteamReviewSummary,
    SteamStoreItem,
} from './steam.types';

const STORE = 'https://store.steampowered.com';
const ASSETS = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps';
const ASSET_HOST = 'https://shared.akamai.steamstatic.com/store_item_assets/';
const ASSET_BATCH = 40;
const TIMEOUT_MS = 8000;
const HOUR = 60 * 60 * 1000;
const CACHE_PATH = dataPath('steam-cache.json');
const SAVE_DELAY_MS = 10_000;

// Cliente de las APIs JSON públicas de Steam (sin key). Steam corta con 429
// si se le pegan cientos de requests en pocos minutos, así que:
// - las llamadas pasan por un limitador de concurrencia;
// - las portadas de la tienda (featured*) se reutilizan 10 minutos: todas
//   las listas de una misma pasada del cron comparten una sola llamada;
// - fichas, reseñas y assets se cachean y se guardan en data/, para que un
//   reinicio o un deploy no vuelva a pedir todo de cero.
@Injectable()
export class SteamApiClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SteamApiClient.name);
    private readonly limiter = new ConcurrencyLimiter(3);
    private readonly storeFront = new TtlCache<unknown>(10 * 60 * 1000);
    private saveTimer: NodeJS.Timeout | null = null;
    private readonly details = new TtlCache<SteamAppData | null>(12 * HOUR);
    private readonly reviews = new TtlCache<SteamReviewSummary | null>(24 * HOUR);
    private readonly assets = new TtlCache<boolean>(24 * HOUR);
    private readonly art = new TtlCache<GameArt | null>(24 * HOUR);

    constructor(private readonly config: AppConfigService) {}

    async onModuleInit() {
        try {
            const saved = await readJsonFile<Record<string, never>>(CACHE_PATH);
            this.details.load(saved?.['details']);
            this.reviews.load(saved?.['reviews']);
            this.assets.load(saved?.['assets']);
            this.art.load(saved?.['art']);
        } catch (err) {
            this.logger.error('no se pudo leer la caché de Steam', err as Error);
        }
    }

    async onModuleDestroy() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        await this.save();
    }

    // Guarda como mucho una vez cada 10 s (unref: no retiene el proceso).
    private scheduleSave() {
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            void this.save();
        }, SAVE_DELAY_MS);
        this.saveTimer.unref();
    }

    private save() {
        return writeJsonFile(CACHE_PATH, {
            details: this.details.toJSON(),
            reviews: this.reviews.toJSON(),
            assets: this.assets.toJSON(),
            art: this.art.toJSON(),
        }).catch((err) => this.logger.error('no se pudo guardar la caché de Steam', err));
    }

    private async cachedStoreFront<T>(key: string, url: string): Promise<T | null> {
        const cached = this.storeFront.get(key) as T | undefined;
        if (cached) return cached;
        const json = await this.get<T>(url);
        if (json) this.storeFront.set(key, json);
        return json;
    }

    private get region(): string {
        return `cc=${this.config.get('STEAM_COUNTRY')}&l=${this.config.get('STEAM_LANGUAGE')}`;
    }

    private get<T>(url: string): Promise<T | null> {
        return this.limiter.run(() => fetchJson<T>(url, TIMEOUT_MS));
    }

    featuredCategories(): Promise<SteamFeaturedCategories | null> {
        return this.cachedStoreFront('featuredcategories', `${STORE}/api/featuredcategories?${this.region}`);
    }

    featured(): Promise<SteamFeatured | null> {
        return this.cachedStoreFront('featured', `${STORE}/api/featured?${this.region}`);
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
        this.scheduleSave();
        return data;
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
        this.scheduleSave();
        return summary;
    }

    async news(appId: string, count: number): Promise<SteamNewsRaw[]> {
        const json = await this.get<{ appnews?: { newsitems?: SteamNewsRaw[] } }>(
            `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=280&feeds=steam_community_announcements`,
        );
        return json?.appnews?.newsitems ?? [];
    }

    // URLs reales (con hash) de portada, hero y header, de a lotes de 40 en
    // una sola llamada a IStoreBrowseService.
    async storeAssets(appIds: string[]): Promise<Map<string, GameArt | null>> {
        const out = new Map<string, GameArt | null>();
        const missing = [...new Set(appIds)].filter((id) => {
            const cached = this.art.get(id);
            if (cached !== undefined) out.set(id, cached);
            return cached === undefined;
        });

        for (let i = 0; i < missing.length; i += ASSET_BATCH) {
            const batch = missing.slice(i, i + ASSET_BATCH);
            const input = {
                ids: batch.map((id) => ({ appid: Number(id) })),
                context: { language: this.config.get('STEAM_LANGUAGE'), country_code: this.config.get('STEAM_COUNTRY') },
                data_request: { include_assets: true },
            };
            const json = await this.get<{ response?: { store_items?: SteamStoreItem[] } }>(
                `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`,
            );
            const items = json?.response?.store_items ?? [];
            for (const id of batch) {
                const item = items.find((it) => String(it.appid) === id);
                const art = item?.success === 1 && item.assets ? this.toArt(item.assets) : null;
                // Una llamada fallida no se cachea: se reintenta en la próxima.
                if (json) this.art.set(id, art);
                out.set(id, art);
            }
        }
        if (missing.length > 0) this.scheduleSave();
        return out;
    }

    private toArt(assets: NonNullable<SteamStoreItem['assets']>): GameArt {
        const url = (file?: string) => (file ? ASSET_HOST + assets.asset_url_format.replace('${FILENAME}', file) : null);
        return { portrait: url(assets.library_capsule), hero: url(assets.library_hero), header: url(assets.header) };
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
        this.scheduleSave();
        return exists;
    }
}
