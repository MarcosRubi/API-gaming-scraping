export const SITES = ['steam', 'gog', 'instant-gaming', 'humble', 'fanatical'] as const;
export type Site = (typeof SITES)[number];

export function isSite(value: string): value is Site {
    return (SITES as readonly string[]).includes(value);
}

// La clave de caché termina con el nombre del sitio ("top-sellers-gog").
// instant-gaming va primero en SITES para que "...-instant-gaming" no
// matchee antes por otro sufijo.
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
