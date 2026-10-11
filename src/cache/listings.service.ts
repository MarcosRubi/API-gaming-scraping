import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import type { Game } from '../common/types';
import { StoreScrapersService, type Listing } from '../scrapers/store-scrapers.service';
import { CacheStoreService } from './cache-store.service';

export interface CachedListing {
    data: Game[];
    updatedAt: number;
}

// Listados cacheados: el scheduler los refresca y los endpoints los sirven
// desde memoria.
@Injectable()
export class ListingsService {
    private readonly logger = new Logger(ListingsService.name);
    private running = false;

    constructor(
        private readonly scrapers: StoreScrapersService,
        private readonly store: CacheStoreService,
        private readonly categories: CategoriesService,
    ) {}

    // Sirve un listado desde la caché. Si la clave nunca se scrapeó con éxito
    // (primer boot sin snapshot, o el último intento del cron falló), hace un
    // scrape puntual de esa clave -- si también falla, el error sube y el
    // filtro global responde 502 en vez de servir null.
    async getCached(key: string): Promise<CachedListing> {
        const listing = this.scrapers.findListing(key);
        if (!listing) throw new NotFoundException(`Listado desconocido: ${key}`);

        const entry = this.store.get(key);
        if (entry?.data && entry.updatedAt) {
            return { data: entry.data, updatedAt: entry.updatedAt };
        }
        return { data: await this.refresh(listing), updatedAt: Date.now() };
    }

    // Después de cada scrape se enriquecen las categorías (cache por URL:
    // solo los juegos nuevos cuestan visitas/llamadas).
    private async refresh(listing: Listing): Promise<Game[]> {
        const data = await listing.scrape();
        await this.categories.enrich(data, listing.site);
        await this.store.set(listing.key, data);
        return data;
    }

    // Recorre los listados de forma secuencial (no en paralelo) para no
    // golpear los sitios origen a la vez. Un fallo puntual no bloquea al
    // resto. Si una pasada anterior sigue corriendo, no se solapa.
    async refreshAll(): Promise<void> {
        if (this.running) {
            this.logger.warn('refresco anterior todavía en curso, se omite esta pasada');
            return;
        }
        this.running = true;
        try {
            for (const listing of this.scrapers.listings) {
                try {
                    await this.refresh(listing);
                    this.logger.log(`actualizado ${listing.key}`);
                } catch (err) {
                    this.logger.error(`fallo actualizando ${listing.key}`, err as Error);
                    this.store.setError(listing.key, (err as Error).message);
                }
            }
        } finally {
            this.running = false;
        }
    }
}
