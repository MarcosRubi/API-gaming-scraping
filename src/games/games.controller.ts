import { Controller, Get, NotFoundException, Param, PipeTransform, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ListingsService } from '../cache/listings.service';
import { CategoriesService } from '../categories/categories.service';
import { isSite, type Game, type SearchResult, type Site } from '../common/types';
import { StoreScrapersService } from '../scrapers/store-scrapers.service';

// /:site/:game solo acepta tiendas conocidas; el resto es 404.
class ParseSitePipe implements PipeTransform<string, Site> {
    transform(value: string): Site {
        if (!isSite(value)) throw new NotFoundException(`Tienda desconocida: ${value}`);
        return value;
    }
}

@Controller()
export class GamesController {
    constructor(
        private readonly scrapers: StoreScrapersService,
        private readonly listings: ListingsService,
        private readonly categories: CategoriesService,
    ) {}

    @Get()
    hello(): string {
        return 'Hello';
    }

    // Listados cacheados: /top-sellers-steam, /best-rated-gog, ...
    @Get(':key')
    async listing(@Param('key') key: string, @Res({ passthrough: true }) res: Response): Promise<Game[]> {
        const { data, updatedAt } = await this.listings.getCached(key);
        res.set('X-Cache-Updated-At', new Date(updatedAt).toISOString());
        return data;
    }

    // Búsqueda en vivo: /steam/hollow%20knight. El enrich corre sin browser
    // (cache + APIs JSON de Steam): suma milisegundos, no visitas de página,
    // y deja intacta la forma "no encontrado" ({ steam: "null" }).
    @Get(':site/:game')
    async search(@Param('site', ParseSitePipe) site: Site, @Param('game') game: string): Promise<SearchResult> {
        const results = await this.scrapers.search(site, game);
        return this.categories.enrich(results, site, { allowBrowser: false });
    }
}
