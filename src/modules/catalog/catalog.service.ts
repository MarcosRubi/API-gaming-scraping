import { Injectable } from '@nestjs/common';
import type { Game } from '../../common/types/game.types';
import { comparableName, stripEdition } from '../../common/utils/game-names';
import { CacheStoreService } from '../listings/cache-store.service';
import { ListingRegistry } from '../listings/listing-registry.service';
import type { Catalog, CatalogGame, CatalogList } from './catalog.types';

// A qué lista temática pertenece cada fuente (por prefijo de su clave).
// El orden también es la prioridad para la popularidad.
const LIST_OF_SOURCE: [prefix: string, list: CatalogList][] = [
    ['top-sellers-', 'mas-vendidos'],
    ['steam-top-sellers', 'mas-vendidos'],
    ['steam-spotlight', 'destacados'],
    ['steam-feature', 'destacados'],
    ['top-offers-', 'ofertas'],
    ['steam-specials', 'ofertas'],
    ['new-releases-', 'novedades'],
    ['steam-new-releases', 'novedades'],
    ['steam-coming-soon', 'proximamente'],
    ['best-rated-', 'mejor-valorados'],
    ['overwhelmingly-positive-', 'mejor-valorados'],
];

// Fuentes que no son juegos (noticias) o que no aportan al catálogo.
const EXCLUDED_SOURCES = new Set(['news']);

function listOf(key: string): { list: CatalogList | null; priority: number } {
    const index = LIST_OF_SOURCE.findIndex(([prefix]) => key.startsWith(prefix));
    return index === -1 ? { list: null, priority: LIST_OF_SOURCE.length } : { list: LIST_OF_SOURCE[index][1], priority: index };
}

// Catálogo completo para la página "Juegos": todas las listas cacheadas en
// una sola respuesta, sin repetir el mismo juego de la misma tienda (se
// fusionan sus listas). Se recalcula solo cuando cambia la caché, así que
// servirlo cuesta lo mismo que servir una lista.
@Injectable()
export class CatalogService {
    private cached: { version: number; catalog: Catalog } | null = null;

    constructor(
        private readonly store: CacheStoreService,
        private readonly registry: ListingRegistry,
    ) {}

    get(): Catalog {
        if (this.cached?.version === this.store.version && this.cached.catalog.games.length > 0) {
            return this.cached.catalog;
        }
        const catalog = this.build();
        this.cached = { version: this.store.version, catalog };
        return catalog;
    }

    private build(): Catalog {
        const byKey = new Map<string, CatalogGame>();

        for (const source of this.registry.sources) {
            if (EXCLUDED_SOURCES.has(source.key) || !source.site) continue;
            const games = this.store.get(source.key)?.data;
            if (!Array.isArray(games)) continue;

            const { list, priority } = listOf(source.key);
            (games as Game[]).forEach((game, position) => {
                if (!game?.name || !game.url) return;
                const rank = priority * 100 + position;
                const key = `${source.site}:${comparableName(stripEdition(game.name)) || game.url}`;
                const existing = byKey.get(key);
                if (existing) {
                    if (list && !existing.lists.includes(list)) existing.lists.push(list);
                    existing.rank = Math.min(existing.rank, rank);
                    // Conserva la versión con más datos (valoración, arte).
                    if (existing.rating === undefined && game.rating !== undefined) {
                        existing.rating = game.rating;
                        existing.ratingCount = game.ratingCount;
                    }
                    existing.art ??= game.art;
                    return;
                }
                // Sin ficha, capturas ni reseñas de texto: la grilla no las usa
                // y pesan (tráilers, descripciones).
                const { details: _details, screenshots: _screenshots, reviews: _reviews, ...lean } = game;
                byKey.set(key, { ...lean, store: source.site!, lists: list ? [list] : [], rank });
            });
        }

        const games = [...byKey.values()].sort((a, b) => a.rank - b.rank);
        return { games, updatedAt: new Date().toISOString() };
    }
}
