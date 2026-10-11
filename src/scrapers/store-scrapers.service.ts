import { Injectable } from '@nestjs/common';
import type { Game, SearchResult, Site } from '../common/types';
import { ScraperEngineService } from './scraper-engine.service';
import { ScreenshotsService } from './screenshots.service';

export interface Listing {
    key: string;
    site: Site;
    scrape: () => Promise<Game[]>;
}

// Catálogo de lo que se scrapea por tienda: la búsqueda y los endpoints "de
// listado" (sin parámetros) que el scheduler refresca periódicamente. Las
// listas que alimentan el banner destacado se enriquecen con screenshots.
@Injectable()
export class StoreScrapersService {
    readonly listings: Listing[];

    constructor(
        private readonly engine: ScraperEngineService,
        private readonly screenshots: ScreenshotsService,
    ) {
        const plain = (site: Site, key: string, configKey = key): Listing => ({
            key,
            site,
            scrape: () => this.engine.scrapeListing(site, configKey),
        });
        const withScreenshots = (site: Site, key: string): Listing => ({
            key,
            site,
            scrape: async () => this.screenshots.enrich(await this.engine.scrapeListing(site, key), site),
        });

        this.listings = [
            plain('steam', 'top-sellers-steam'),
            plain('steam', 'top-offers-steam'),
            plain('steam', 'new-releases-steam'),
            {
                key: 'overwhelmingly-positive-steam',
                site: 'steam',
                scrape: async () =>
                    this.screenshots.enrichSteam(await this.engine.scrapeListing('steam', 'overwhelmingly-positive')),
            },

            plain('gog', 'top-sellers-gog'),
            plain('gog', 'top-old-games-gog'),
            plain('gog', 'new-releases-gog'),
            withScreenshots('gog', 'best-rated-gog'),

            plain('instant-gaming', 'top-sellers-instant-gaming'),
            plain('instant-gaming', 'top-offers-instant-gaming'),
            plain('instant-gaming', 'top-indie-games-instant-gaming'),
            withScreenshots('instant-gaming', 'best-rated-instant-gaming'),

            // En Humble y Fanatical los más vendidos son los "destacados" y
            // alimentan el banner.
            withScreenshots('humble', 'top-sellers-humble'),
            plain('humble', 'new-releases-humble'),
            plain('humble', 'top-offers-humble'),

            withScreenshots('fanatical', 'top-sellers-fanatical'),
            plain('fanatical', 'new-releases-fanatical'),
            plain('fanatical', 'top-offers-fanatical'),
        ];
    }

    findListing(key: string): Listing | undefined {
        return this.listings.find((listing) => listing.key === key);
    }

    search(site: Site, term: string): Promise<SearchResult> {
        return this.engine.scrapeSearch(site, term);
    }
}
