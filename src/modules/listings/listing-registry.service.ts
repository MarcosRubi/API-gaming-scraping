import { Injectable } from '@nestjs/common';
import type { Site } from '../../common/types/game.types';
import { StoreScrapersService } from '../scraping/store-scrapers.service';
import { SteamCatalogService } from '../steam/steam-catalog.service';
import { GENRES } from '../steam/steam-genres';

export interface ListingSource {
    key: string;
    // Tienda de origen: decide cómo se resuelven las categorías.
    site: Site | null;
    fetch: () => Promise<unknown>;
    // Agregar categorías / equivalencia y valoración de Steam.
    enrich: { categories: boolean; steam: boolean };
}

const FULL = { categories: true, steam: true };
const STEAM_ONLY = { categories: false, steam: true };
const NONE = { categories: false, steam: false };

// Catálogo de todo lo que la API sirve desde caché y refresca el cron:
// listas de Steam + noticias + listados scrapeados de cada tienda. Steam va
// primero: son llamadas JSON rápidas y llenan el hero en el primer arranque.
@Injectable()
export class ListingRegistry {
    readonly sources: readonly ListingSource[];

    constructor(scrapers: StoreScrapersService, steam: SteamCatalogService) {
        this.sources = [
            { key: 'steam-spotlight', site: 'steam', fetch: () => steam.spotlight(), enrich: STEAM_ONLY },
            { key: 'steam-feature', site: 'steam', fetch: () => steam.feature(), enrich: STEAM_ONLY },
            { key: 'steam-specials', site: 'steam', fetch: () => steam.list('specials'), enrich: FULL },
            { key: 'steam-coming-soon', site: 'steam', fetch: () => steam.list('coming_soon'), enrich: FULL },
            { key: 'steam-new-releases', site: 'steam', fetch: () => steam.list('new_releases'), enrich: FULL },
            { key: 'steam-top-sellers', site: 'steam', fetch: () => steam.list('top_sellers'), enrich: FULL },
            ...GENRES.map((genre) => ({
                key: `genre-${genre.slug}`,
                site: 'steam' as const,
                fetch: () => steam.genre(genre),
                enrich: FULL,
            })),
            { key: 'news', site: null, fetch: () => steam.news(), enrich: NONE },
            ...scrapers.listings.map((listing) => ({
                key: listing.key,
                site: listing.site,
                fetch: listing.scrape,
                enrich: FULL,
            })),
        ];
    }

    find(key: string): ListingSource | undefined {
        return this.sources.find((source) => source.key === key);
    }
}
