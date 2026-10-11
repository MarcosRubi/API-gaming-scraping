// Géneros de la home. `label` coincide con las categorías normalizadas
// (modules/categories/normalize.ts) y `tagId` es la etiqueta de Steam.
export interface Genre {
    slug: string;
    label: string;
    tagId: number;
}

export const GENRES: readonly Genre[] = [
    { slug: 'action', label: 'Acción', tagId: 19 },
    { slug: 'adventure', label: 'Aventura', tagId: 21 },
    { slug: 'casual', label: 'Casual', tagId: 597 },
    { slug: 'horror', label: 'Terror', tagId: 1667 },
    { slug: 'indie', label: 'Indie', tagId: 492 },
    { slug: 'racing', label: 'Carreras', tagId: 699 },
    { slug: 'rpg', label: 'RPG', tagId: 122 },
    { slug: 'simulation', label: 'Simulación', tagId: 599 },
];
