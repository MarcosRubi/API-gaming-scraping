import { Injectable } from '@nestjs/common';
import type { SearchResult, Site } from '../../common/types/game.types';
import { CategoriesService } from '../categories/categories.service';
import { StoreScrapersService } from '../scraping/store-scrapers.service';
import { normalizeTerm, SearchCache } from './search-cache';

const MINUTE = 60 * 1000;
// Encontrado: 1 h (como los listados). "No disponible": 15 min, por si fue
// un fallo pasajero de la tienda.
const FOUND_TTL_MS = 60 * MINUTE;
const NOT_FOUND_TTL_MS = 15 * MINUTE;

@Injectable()
export class SearchService {
    private readonly cache = new SearchCache<SearchResult>({
        ttlMs: (result) => (Array.isArray(result) && result.length > 0 ? FOUND_TTL_MS : NOT_FOUND_TTL_MS),
    });

    constructor(
        private readonly scrapers: StoreScrapersService,
        private readonly categories: CategoriesService,
    ) {}

    // Cacheado por tienda + término: los juegos más comparados no vuelven a
    // pegarle a la tienda en cada visita.
    find(site: Site, term: string): Promise<SearchResult> {
        return this.cache.get(`${site}:${normalizeTerm(term)}`, () => this.fetch(site, term));
    }

    // El enrich corre sin browser (caché + APIs JSON de Steam): suma
    // milisegundos, no visitas de página, y deja intacta la forma
    // "no encontrado" ({ steam: "null" }).
    private async fetch(site: Site, term: string): Promise<SearchResult> {
        const results = await this.scrapers.search(site, term);
        return this.categories.enrich(results, site, { allowBrowser: false });
    }
}
