import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import type { Catalog } from './catalog.types';

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalog: CatalogService) {}

    // Todos los juegos de las listas cacheadas, para filtrar en el cliente.
    @Get()
    get(): Catalog {
        return this.catalog.get();
    }
}
