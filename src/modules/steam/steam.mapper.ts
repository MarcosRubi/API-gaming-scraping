import type { Game, GameDetails, PriceEntry } from '../../common/types/game.types';
import type { SteamAppData, SteamListItem, SteamPriceOverview } from './steam.types';

// Descriptores de contenido de Steam: 3 = sexual solo adultos,
// 4 = desnudos/sexual frecuente. Esos juegos no se muestran.
const ADULT_DESCRIPTORS = [3, 4];
// Géneros de software de Steam (51-60: utilidades, edición de video/foto,
// desarrollo...): apps que no son juegos aunque Steam las marque como tal.
const SOFTWARE_GENRES = new Set(['51', '52', '53', '54', '55', '56', '57', '58', '59', '60']);

const cents = (value: number) => `US$${(value / 100).toFixed(2)}`;

export function storeUrl(appId: string | number): string {
    return `https://store.steampowered.com/app/${appId}`;
}

function buildPrice(final: number, original: number | null, discounted: boolean, comingSoon: boolean): PriceEntry[] {
    if (comingSoon) return [{ now: 'Próximamente' }];
    if (final === 0) return [{ now: 'Gratis' }];
    if (discounted && original) return [{ now: cents(final) }, { old: cents(original) }];
    return [{ now: cents(final) }];
}

// Ítem de featuredcategories / featured → Game.
export function fromListItem(item: SteamListItem, comingSoon = false): Game {
    const id = String(item.id);
    return {
        name: item.name,
        imgUrl: item.large_capsule_image ?? item.header_image ?? null,
        price: buildPrice(item.final_price, item.original_price, item.discounted, comingSoon && !item.final_price),
        discount: item.discounted && item.discount_percent ? `-${item.discount_percent}%` : '',
        url: storeUrl(id),
        appId: id,
        steamAppId: id,
    };
}

// Resultado de búsqueda por género (+ precio por lote) → Game.
export function fromSearch(appId: string, name: string, price: SteamPriceOverview | null, headerUrl: string): Game {
    return {
        name,
        imgUrl: headerUrl,
        price: price
            ? buildPrice(price.final, price.initial, price.discount_percent > 0, false)
            : [{ now: 'Gratis' }],
        discount: price?.discount_percent ? `-${price.discount_percent}%` : '',
        url: storeUrl(appId),
        appId,
        steamAppId: appId,
    };
}

export function isPlayableGame(data: SteamAppData | null): data is SteamAppData {
    if (!data || data.type !== 'game') return false;
    const descriptors = data.content_descriptors?.ids ?? [];
    if (descriptors.some((id) => ADULT_DESCRIPTORS.includes(id))) return false;
    return !(data.genres ?? []).some((genre) => SOFTWARE_GENRES.has(genre.id));
}

// Steam a veces manda entidades HTML en la descripción corta.
function decodeEntities(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

export function toDetails(data: SteamAppData, heroUrl: string | null, logoUrl: string | null): GameDetails {
    const screenshots = (data.screenshots ?? []).map((s) => s.path_full);
    return {
        description: decodeEntities(data.short_description || ''),
        heroUrl,
        logoUrl,
        background: data.background_raw ?? null,
        // La miniatura de Steam es de 293px: como póster se usa una captura HD.
        trailers: (data.movies ?? [])
            .filter((movie) => movie.hls_h264)
            .slice(0, 4)
            .map((movie, i) => ({
                name: movie.name,
                thumbnail: screenshots[i] ?? movie.thumbnail,
                hls: movie.hls_h264 as string,
            })),
        screenshots: screenshots.slice(0, 6),
        releaseDate: data.release_date?.date || null,
        comingSoon: data.release_date?.coming_soon ?? false,
        genres: (data.genres ?? []).map((g) => g.description),
    };
}
