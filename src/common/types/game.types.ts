export const SITES = ['steam', 'gog', 'instant-gaming', 'humble', 'fanatical'] as const;
export type Site = (typeof SITES)[number];

export function isSite(value: string): value is Site {
    return (SITES as readonly string[]).includes(value);
}

// La clave de caché termina con el nombre del sitio ("top-sellers-gog").
export function siteOfKey(key: string): Site | null {
    return SITES.find((site) => key.endsWith(site)) ?? null;
}

export interface PriceEntry {
    now?: string;
    old?: string;
}

export interface Game {
    name: string | null;
    imgUrl: string | null;
    price: PriceEntry[];
    discount: string;
    url: string | null;
    categories?: string[];
    reviews?: string;
    appId?: string;
    screenshots?: string[];
    // App de Steam equivalente (también para juegos de otras tiendas, buscada
    // por nombre): con ella el frontend arma la portada vertical y el hero.
    steamAppId?: string;
    // Valoración 0-5 a partir de las reseñas de Steam, y cantidad de reseñas.
    rating?: number;
    ratingCount?: number;
    // URLs reales de los assets de Steam (las rutas llevan hash).
    art?: GameArt;
    // Ficha ampliada (solo en listas que la necesitan: hero, destacado).
    details?: GameDetails;
}

export interface GameArt {
    // Portada vertical 600x900.
    portrait: string | null;
    // Arte ancho 1920x620.
    hero: string | null;
    header: string | null;
}

export interface Trailer {
    name: string;
    thumbnail: string;
    // Stream HLS (Steam ya no publica MP4).
    hls: string;
}

export interface GameDetails {
    description: string;
    heroUrl: string | null;
    logoUrl: string | null;
    background: string | null;
    trailers: Trailer[];
    screenshots: string[];
    releaseDate: string | null;
    comingSoon: boolean;
    genres: string[];
}

export interface NewsItem {
    id: string;
    title: string;
    url: string;
    excerpt: string;
    date: number;
    feed: string;
    gameName: string;
    steamAppId: string;
    imageUrl: string | null;
}

// Forma "no encontrado" que el frontend espera: { steam: "null" }.
export type NotFound = Partial<Record<Site, 'null'>>;
export type SearchResult = Game[] | NotFound;

export interface FieldConfig {
    selector?: string | null;
    attr?: string;
    preferAttr?: string;
    splitOn?: string;
    index?: number;
    textPattern?: string;
    patternIndex?: number;
    patternMinCount?: number;
    optional?: boolean;
}

export interface ContainerScope {
    sectionSelector?: string;
    headingSelector: string;
    headingText: string;
    maxAncestorHops?: number;
}

export interface SelectorConfig {
    kind: 'search' | 'listing';
    url: string;
    container: string;
    fields: Record<string, FieldConfig>;
    limit?: number;
    expectedMin?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    waitForSelector?: string;
    dismissSelector?: string;
    scrollBeforeExtract?: boolean;
    containerScope?: ContainerScope;
    notFoundShape?: Site;
    fallbackPriceText?: string;
    currency?: 'USD' | 'EUR';
}

export type RawItem = Record<string, string | null>;
export interface RawExtraction {
    matchedCount: number;
    items: RawItem[];
}
