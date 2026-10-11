import { Injectable } from '@nestjs/common';
import type { SearchResult, Site } from '../../common/types/game.types';
import { CategoriesService } from '../categories/categories.service';
import { StoreScrapersService } from '../scraping/store-scrapers.service';

@Injectable()
export class SearchService {
    constructor(
        private readonly scrapers: StoreScrapersService,
        private readonly categories: CategoriesService,
    ) {}

    // El enrich corre sin browser (caché + APIs JSON de Steam): suma
    // milisegundos, no visitas de página, y deja intacta la forma
    // "no encontrado" ({ steam: "null" }).
    async find(site: Site, term: string): Promise<SearchResult> {
        const results = await this.scrapers.search(site, term);
        return this.categories.enrich(results, site, { allowBrowser: false });
    }
}
