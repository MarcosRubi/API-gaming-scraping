import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { SteamEnrichService } from '../steam/steam-enrich.service';
import { CacheStoreService } from './cache-store.service';
import { ListingRegistry, type ListingSource } from './listing-registry.service';

export interface CachedListing {
    data: unknown;
    updatedAt: number;
}

// Listados cacheados: el scheduler los refresca y los endpoints los sirven
// desde memoria.
@Injectable()
export class ListingsService {
    private readonly logger = new Logger(ListingsService.name);
    private running = false;

    constructor(
        private readonly registry: ListingRegistry,
        private readonly store: CacheStoreService,
        private readonly categories: CategoriesService,
        private readonly steamEnrich: SteamEnrichService,
    ) {}

    // Sirve un listado desde la caché. Si la clave nunca se obtuvo con éxito
    // (primer arranque sin snapshot o el último intento falló), lo pide en
    // el momento; si eso también falla, el filtro global responde 502.
    async getCached(key: string): Promise<CachedListing> {
        const source = this.registry.find(key);
        if (!source) throw new NotFoundException(`Listado desconocido: ${key}`);

        const entry = this.store.get(key);
        if (entry?.data && entry.updatedAt) {
            return { data: entry.data, updatedAt: entry.updatedAt };
        }
        return { data: await this.refresh(source), updatedAt: Date.now() };
    }

    private async refresh(source: ListingSource): Promise<unknown> {
        const data = await source.fetch();
        // Una lista vacía casi siempre es un fallo de la fuente (Steam con 403/
        // 429 hace que todas las fichas fallen y se filtren todos los juegos):
        // se trata como error para no pisar la última versión buena.
        if (Array.isArray(data) && data.length === 0) {
            throw new Error(`${source.key} vino vacía; se conserva la versión anterior`);
        }
        if (source.enrich.categories) await this.categories.enrich(data, source.site);
        if (source.enrich.steam) await this.steamEnrich.enrich(data);
        await this.store.set(source.key, data);
        return data;
    }

    // Recorre las fuentes de forma secuencial para no golpear los sitios a
    // la vez. Un fallo puntual no bloquea al resto y una pasada no se solapa
    // con la anterior.
    // `olderThanMs`: saltea las fuentes actualizadas hace menos que eso.
    async refreshAll({ olderThanMs }: { olderThanMs?: number } = {}): Promise<void> {
        if (this.running) {
            this.logger.warn('refresco anterior todavía en curso, se omite esta pasada');
            return;
        }
        this.running = true;
        try {
            for (const source of this.registry.sources) {
                const updatedAt = this.store.get(source.key)?.updatedAt;
                if (olderThanMs && updatedAt && Date.now() - updatedAt < olderThanMs) continue;
                try {
                    await this.refresh(source);
                    this.logger.log(`actualizado ${source.key}`);
                } catch (err) {
                    this.logger.error(`fallo actualizando ${source.key}`, err as Error);
                    this.store.setError(source.key, (err as Error).message);
                }
            }
        } finally {
            this.running = false;
        }
    }
}
