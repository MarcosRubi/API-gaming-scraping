import { Injectable } from '@nestjs/common';
import type { Game, NewsItem } from '../../common/types/game.types';
import { SteamApiClient } from './steam-api.client';
import { fromAppData, fromListItem, isPlayableGame, toDetails } from './steam.mapper';
import type { Genre } from './steam-genres';
import type { SteamListItem } from './steam.types';

export type SteamListKind = 'specials' | 'coming_soon' | 'new_releases' | 'top_sellers';

const LIST_SIZE = 12;
const SPOTLIGHT_SIZE = 5;
// Varios más de los que se muestran: la home descarta los que ya aparecen
// en secciones de arriba y aún así le quedan diez (dos filas).
const GENRE_SIZE = 22;

// Listas de la home armadas con las APIs JSON de Steam. Cada una sale de
// una fuente distinta (destacados, ofertas, próximos, novedades, géneros),
// así las secciones no repiten los mismos juegos.
@Injectable()
export class SteamCatalogService {
    constructor(private readonly steam: SteamApiClient) {}

    // Ofertas / Próximamente / Novedades / Más vendidos de Steam. Se filtran
    // contenido adulto y lo que no es un juego (hardware, software).
    async list(kind: SteamListKind): Promise<Game[]> {
        const categories = await this.steam.featuredCategories();
        if (!categories) throw new Error('Steam no respondió featuredcategories');
        const items = this.unique(categories[kind]?.items ?? []);
        const games: Game[] = [];
        for (const item of items) {
            if (games.length >= LIST_SIZE) break;
            if (!isPlayableGame(await this.steam.appDetails(String(item.id)))) continue;
            games.push(fromListItem(item, kind === 'coming_soon'));
        }
        return games;
    }

    // Slides del hero: destacados de la portada de Steam + más vendidos +
    // ofertas, con ficha completa (descripción, arte hero, logo, tráilers).
    async spotlight(): Promise<Game[]> {
        const [featured, categories] = await Promise.all([this.steam.featured(), this.steam.featuredCategories()]);
        const candidates = this.unique([
            ...(featured?.large_capsules ?? []),
            ...(categories?.top_sellers?.items ?? []),
            ...(categories?.specials?.items ?? []),
        ]);
        return this.withDetails(candidates, SPOTLIGHT_SIZE, { requireHero: true });
    }

    // Juego destacado con tráilers (sección grande con videos): uno de los
    // más vendidos u ofertas con al menos dos tráilers que no esté ya en el
    // hero; si no hay, un próximo lanzamiento o novedad. Las fichas ya están
    // en caché, así que recalcular el hero para excluirlo es barato.
    async feature(): Promise<Game[]> {
        const [categories, spotlight] = await Promise.all([this.steam.featuredCategories(), this.spotlight()]);
        const inHero = new Set(spotlight.map((game) => Number(game.appId)));
        const candidates = this.unique([
            ...(categories?.top_sellers?.items ?? []),
            ...(categories?.specials?.items ?? []),
            ...(categories?.coming_soon?.items ?? []),
            ...(categories?.new_releases?.items ?? []),
        ]).filter((item) => !inHero.has(item.id));
        return this.withDetails(candidates, 1, { requireHero: true, minTrailers: 2 }, true);
    }

    // Más populares de un género. La búsqueda por etiqueta solo da nombre y
    // appid: la imagen y el precio salen de la ficha (en caché 12 h), que
    // además permite filtrar contenido adulto y software.
    async genre(genre: Genre): Promise<Game[]> {
        const results = await this.steam.searchByTag(genre.tagId, GENRE_SIZE + 6);
        if (results.length === 0) throw new Error(`Steam no devolvió juegos para el género ${genre.slug}`);
        const games: Game[] = [];
        for (const result of results) {
            if (games.length >= GENRE_SIZE) break;
            const data = await this.steam.appDetails(result.appId);
            if (isPlayableGame(data)) games.push(fromAppData(data));
        }
        return games;
    }

    // Últimas noticias oficiales de los juegos más vendidos.
    async news(): Promise<NewsItem[]> {
        const categories = await this.steam.featuredCategories();
        const games = this.unique([...(categories?.top_sellers?.items ?? []), ...(categories?.specials?.items ?? [])]);
        const news: NewsItem[] = [];
        for (const item of games) {
            if (news.length >= 3) break;
            const appId = String(item.id);
            if (!isPlayableGame(await this.steam.appDetails(appId))) continue;
            const [latest] = await this.steam.news(appId, 1);
            if (!latest) continue;
            const art = (await this.steam.storeAssets([appId])).get(appId);
            news.push({
                id: latest.gid,
                title: latest.title,
                url: latest.url,
                excerpt: latest.contents.replace(/\[[^\]]+\]|<[^>]+>|https?:\/\/\S+/g, '').trim(),
                date: latest.date,
                feed: latest.feedlabel,
                gameName: item.name,
                steamAppId: appId,
                imageUrl: art?.hero ?? art?.header ?? item.header_image ?? null,
            });
        }
        return news;
    }

    private async withDetails(
        candidates: SteamListItem[],
        size: number,
        { requireHero = false, minTrailers = 0 },
        comingSoonAware = false,
    ): Promise<Game[]> {
        const games: Game[] = [];
        for (const item of candidates) {
            if (games.length >= size) break;
            const appId = String(item.id);
            const data = await this.steam.appDetails(appId);
            if (!isPlayableGame(data) || !data.short_description) continue;
            if ((data.movies?.filter((m) => m.hls_h264).length ?? 0) < minTrailers) continue;

            const art = (await this.steam.storeAssets([appId])).get(appId) ?? null;
            if (requireHero && !art?.hero) continue;
            // El logo no viene en los assets del catálogo: se comprueba aparte.
            const logoUrl = this.steam.assetUrl(appId, 'logo.png');
            const hasLogo = await this.steam.assetExists(logoUrl);

            const details = toDetails(data, art?.hero ?? null, hasLogo ? logoUrl : null);
            games.push({
                ...fromListItem(item, comingSoonAware && details.comingSoon),
                art: art ?? undefined,
                details,
                categories: details.genres,
            });
        }
        return games;
    }

    private unique(items: SteamListItem[]): SteamListItem[] {
        const seen = new Set<number>();
        return items.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }
}
