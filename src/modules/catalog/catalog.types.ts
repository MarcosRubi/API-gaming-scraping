import type { Game, Site } from '../../common/types/game.types';

// Listas temáticas a las que puede pertenecer un juego del catálogo.
export const CATALOG_LISTS = ['destacados', 'mas-vendidos', 'ofertas', 'novedades', 'proximamente', 'mejor-valorados'] as const;
export type CatalogList = (typeof CATALOG_LISTS)[number];

export interface CatalogGame extends Game {
    store: Site;
    lists: CatalogList[];
    // Menor = más popular (posición en su mejor lista, priorizando más vendidos).
    rank: number;
}

export interface Catalog {
    games: CatalogGame[];
    updatedAt: string;
}
