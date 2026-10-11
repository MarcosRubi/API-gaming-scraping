// Formas (parciales) de las respuestas JSON públicas de la tienda de Steam.

export interface SteamListItem {
    id: number;
    type: number;
    name: string;
    discounted: boolean;
    discount_percent: number;
    original_price: number | null;
    final_price: number;
    currency: string;
    large_capsule_image?: string;
    header_image?: string;
}

export interface SteamFeaturedCategories {
    specials?: { items: SteamListItem[] };
    coming_soon?: { items: SteamListItem[] };
    top_sellers?: { items: SteamListItem[] };
    new_releases?: { items: SteamListItem[] };
}

export interface SteamFeatured {
    large_capsules?: SteamListItem[];
}

export interface SteamPriceOverview {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
}

export interface SteamAppData {
    type: string;
    name: string;
    steam_appid: number;
    is_free: boolean;
    short_description: string;
    header_image: string;
    background_raw?: string;
    price_overview?: SteamPriceOverview;
    genres?: { id: string; description: string }[];
    screenshots?: { id: number; path_full: string }[];
    movies?: { id: number; name: string; thumbnail: string; hls_h264?: string }[];
    release_date?: { coming_soon: boolean; date: string };
    content_descriptors?: { ids: number[] };
}

export interface SteamReviewSummary {
    total_positive: number;
    total_reviews: number;
}

export interface SteamNewsRaw {
    gid: string;
    title: string;
    url: string;
    contents: string;
    feedlabel: string;
    date: number;
}
