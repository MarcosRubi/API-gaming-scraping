import { Injectable } from '@nestjs/common';
import { BrowserService } from '../browser/browser.service';
import { fetchJson } from '../common/http';
import type { Game, Site } from '../common/types';
import { CategoriesCacheService } from './categories-cache.service';
import { normalizeCategories } from './normalize';

// Enriquecimiento de categorías por juego. Fuentes, en orden de costo:
//   1. Ya vienen del tile (Steam home tabs) → solo se normalizan.
//   2. Cache persistente por URL (data/categories-cache.json).
//   3. Steam: API JSON appdetails por appid parseado de la URL (sin browser).
//   4. GOG / Instant Gaming / Fanatical: visita a la página de producto con
//      el browser persistente (solo listados del cron, no búsquedas).
//   5. Fallback (Humble y fallidos): buscar el juego en la API de Steam por
//      nombre y usar sus géneros, validando similitud de nombres.

// Selectores de géneros en la página de producto (sondeados en vivo).
const SITE_DETAIL: Partial<Record<Site, string>> = {
    gog: ".details__link[href*='genres']",
    'instant-gaming': '.genres a',
    fanatical: ".product-details a[href*='/categories/']",
};

const FETCH_TIMEOUT_MS = 8000;

function parseSteamAppId(url: string | null): string | null {
    const match = String(url || '').match(/\/app\/(\d+)/);
    return match ? match[1] : null;
}

// Nombre "comparable": minúsculas y solo alfanuméricos, para validar que lo
// que devolvió la búsqueda de Steam es realmente el mismo juego.
function comparable(name: string | null): string {
    return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function similarNames(a: string, b: string): boolean {
    const ca = comparable(a);
    const cb = comparable(b);
    if (!ca || !cb) return false;
    return ca.includes(cb) || cb.includes(ca);
}

// Los sufijos de edición hacen fallar la búsqueda exacta en Steam
// ("X Deluxe Edition" no existe como app, "X" sí — y comparte géneros).
function stripEdition(name: string | null): string {
    return String(name || '')
        .replace(/\b(deluxe|ultimate|gold|standard|definitive|complete|goty|premium)\b/gi, '')
        .replace(/\bedition\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export interface EnrichOptions {
    // false en búsquedas: evita visitas de página para no sumar segundos de
    // latencia; usa tiles, cache y APIs JSON solamente.
    allowBrowser?: boolean;
}

@Injectable()
export class CategoriesService {
    constructor(
        private readonly browser: BrowserService,
        private readonly cache: CategoriesCacheService,
    ) {}

    // Muta cada item agregándole `categories: string[]`. Acepta cualquier
    // resultado de scraper: si no es un array (forma "no encontrado"), lo
    // devuelve intacto.
    async enrich<T>(items: T, site: Site | null, { allowBrowser = true }: EnrichOptions = {}): Promise<T> {
        if (!Array.isArray(items) || items.length === 0 || !site) return items;

        for (const item of items as Game[]) {
            try {
                if (Array.isArray(item.categories) && item.categories.length > 0) {
                    item.categories = normalizeCategories(item.categories);
                    this.cache.set(item.url, item.categories);
                } else {
                    item.categories = await this.resolve(site, item, allowBrowser);
                }
            } catch {
                item.categories = [];
            }
        }

        await this.cache.persist();
        return items;
    }

    private async resolve(site: Site, item: Game, allowBrowser: boolean): Promise<string[]> {
        const cached = this.cache.get(item.url);
        // Re-normalizar el hit: si la tabla de normalización ganó mapeos nuevos
        // desde que se cacheó, se aplican sin esperar a que expire el TTL.
        if (cached) return normalizeCategories(cached);

        let raw: string[] = [];
        if (site === 'steam') {
            const appId = parseSteamAppId(item.url);
            if (appId) raw = await this.steamGenresByAppId(appId);
        } else if (SITE_DETAIL[site] && allowBrowser) {
            raw = await this.scrapeDetailGenres(site, item.url);
        }
        if (raw.length === 0 && site !== 'steam') {
            raw = await this.steamGenresByName(item.name);
        }

        const categories = normalizeCategories(raw);
        // En modo sin browser no cacheamos los vacíos de sitios scrapeables: el
        // próximo cron (con browser) debe poder intentar la página de producto.
        if (categories.length > 0 || site === 'steam' || allowBrowser || !SITE_DETAIL[site]) {
            this.cache.set(item.url, categories);
        }
        return categories;
    }

    private async steamGenresByAppId(appId: string | number): Promise<string[]> {
        const data = await fetchJson(
            `https://store.steampowered.com/api/appdetails?appids=${appId}&l=spanish&filters=genres`,
            FETCH_TIMEOUT_MS,
        );
        const genres = data?.[appId]?.data?.genres;
        return Array.isArray(genres) ? genres.map((g: { description: string }) => g.description) : [];
    }

    // Fallback por nombre: la mayoría del catálogo de Humble/Fanatical son keys
    // de Steam, así que sus géneros aplican. Si el primer resultado no se parece
    // al nombre buscado, mejor sin categorías que con las de otro juego.
    private async steamGenresByName(name: string | null): Promise<string[]> {
        const term = stripEdition(name);
        if (!term) return [];
        const data = await fetchJson(
            `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=US&l=spanish`,
            FETCH_TIMEOUT_MS,
        );
        const first = data?.items?.[0];
        if (!first || !similarNames(first.name, term)) return [];
        return this.steamGenresByAppId(first.id);
    }

    private async scrapeDetailGenres(site: Site, url: string | null): Promise<string[]> {
        const selector = SITE_DETAIL[site];
        if (!selector || !url) return [];
        return this.browser
            .withPage(async (page) => {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await page.waitForSelector(selector, { timeout: 7000 }).catch(() => {});
                return page.evaluate(
                    (sel: string) =>
                        Array.from(document.querySelectorAll(sel))
                            .slice(0, 8)
                            .map((el) => (el.textContent || '').trim()),
                    selector,
                );
            })
            .catch(() => [] as string[]);
    }
}
