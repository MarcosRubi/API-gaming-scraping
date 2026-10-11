import { Controller, Get, Param } from '@nestjs/common';
import type { SearchResult, Site } from '../../common/types/game.types';
import { ParseSitePipe } from './parse-site.pipe';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
    constructor(private readonly search: SearchService) {}

    // Búsqueda en vivo en una tienda: /search/steam/hollow%20knight
    @Get(':site/:term')
    find(@Param('site', ParseSitePipe) site: Site, @Param('term') term: string): Promise<SearchResult> {
        return this.search.find(site, term);
    }
}
