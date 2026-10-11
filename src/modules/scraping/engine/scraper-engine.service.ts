import { Injectable } from '@nestjs/common';
import type { Page } from 'puppeteer-core';
import { BrowserService } from '../../../infrastructure/browser/browser.service';
import type { Game, PriceEntry, RawExtraction, RawItem, SearchResult, SelectorConfig, Site } from '../../../common/types/game.types';
import { SelectorStoreService } from '../selectors/selector-store.service';
import { SelfHealService } from '../self-heal/self-heal.service';
import { collectListItems } from './collect';
import { filterByRelevance } from './relevance';

function buildUrl(config: SelectorConfig, term?: string): string {
    if (!config.url.includes('{term}')) return config.url;
    return config.url.replace('{term}', encodeURIComponent(term || ''));
}

// Decide si el resultado de un scrape amerita disparar self-heal: un error
// tirado ya lo cubre aparte; esto cubre el caso más traicionero, "no tiró
// error pero el resultado es basura" (contenedor vacío en un listado, o
// items sin nombre/url porque el selector apunta a otra cosa).
function isSuspicious(raw: RawExtraction | null, results: Game[], config: SelectorConfig): boolean {
    if (!raw) return true;
    if (raw.matchedCount === 0) {
        // Una búsqueda puede legítimamente no tener resultados; un listado no.
        return config.kind === 'listing';
    }
    const allMissingCore = results.every((r) => !r.name || !r.url);
    if (allMissingCore) return true;
    if (config.kind === 'listing' && results.length < (config.expectedMin || 1)) return true;
    return false;
}

// Cada tienda escribe el precio a su manera ("$24.99", "US$14.99", "16,09€").
// Normalizamos todos a "US$X.XX" / "EU€X.XX" según config.currency para que
// la UI sea consistente. Textos sin dígitos ("Gratis", "Free To Play",
// "No encontrado") pasan tal cual.
function formatPrice(value: string, config: SelectorConfig): string {
    if (!value) return value;
    const match = String(value).replace(',', '.').match(/\d+(\.\d+)?/);
    if (!match) return value;
    return config.currency === 'EUR' ? `EU€${match[0]}` : `US$${match[0]}`;
}

function assemblePrice(item: RawItem, config: SelectorConfig): PriceEntry[] {
    if (item.priceOld) {
        let now = item.price || '';
        if (now.includes(item.priceOld)) now = now.replace(item.priceOld, '').trim();
        return [{ now: formatPrice(now, config) }, { old: formatPrice(item.priceOld, config) }];
    }
    if (item.price) {
        return [{ now: formatPrice(item.price, config) }];
    }
    return [{ now: config.fallbackPriceText || 'No encontrado' }];
}

function postProcess(raw: RawExtraction, config: SelectorConfig): Game[] {
    return raw.items.map((item) => {
        const out: Game = {
            name: item.name,
            imgUrl: item.imgUrl,
            price: assemblePrice(item, config),
            discount: item.discount || '',
            url: item.url,
        };
        if (item.categories) {
            out.categories = String(item.categories)
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean);
        }
        if (item.reviews) {
            out.reviews = item.reviews;
        }
        const appIdMatch = item.url ? String(item.url).match(/\/app\/(\d+)/) : null;
        if (appIdMatch) {
            out.appId = appIdMatch[1];
        }
        return out;
    });
}

async function runOnce(page: Page, config: SelectorConfig) {
    try {
        const raw = await page.evaluate(collectListItems, config);
        return { raw, error: null };
    } catch (error) {
        return { raw: null, error: error as Error };
    }
}

// Motor genérico: abre la URL configurada para site/key, extrae con los
// selectores del JSON y, si el resultado se ve roto, intenta auto-repararlos.
@Injectable()
export class ScraperEngineService {
    constructor(
        private readonly browser: BrowserService,
        private readonly selectorStore: SelectorStoreService,
        private readonly selfHeal: SelfHealService,
    ) {}

    // Listados: siempre devuelven un array de juegos.
    async scrapeListing(site: Site, key: string): Promise<Game[]> {
        return (await this.scrape(site, key)) as Game[];
    }

    // Búsquedas: array de juegos o la forma "no encontrado" ({ steam: "null" }).
    scrapeSearch(site: Site, term: string): Promise<SearchResult> {
        return this.scrape(site, 'search', term);
    }

    private async scrape(site: Site, key: string, term?: string): Promise<SearchResult> {
        const config = this.selectorStore.getConfig(site, key);
        if (!config) throw new Error(`No hay configuración de selectores para ${site}/${key}`);

        return this.browser.withPage(async (page) => {
            await page.goto(buildUrl(config, term), { waitUntil: config.waitUntil || 'domcontentloaded', timeout: 30000 });
            if (config.dismissSelector) {
                // Banners de cookies/consentimiento: si ya se aceptó en una página
                // previa de este mismo browser persistente, el selector no
                // aparece y esto no hace nada.
                await page.click(config.dismissSelector).catch(() => {});
            }
            if (config.waitForSelector) {
                await page.waitForSelector(config.waitForSelector, { timeout: 8000 }).catch(() => {});
            }
            if (config.scrollBeforeExtract) {
                await page.evaluate(() => window.scrollBy(0, 2000));
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            let { raw, error } = await runOnce(page, config);
            let activeConfig = config;
            let results = raw ? postProcess(raw, activeConfig) : [];

            if (error || isSuspicious(raw, results, config)) {
                const healed = await this.selfHeal.maybeHeal({
                    site,
                    key,
                    page,
                    config,
                    reason: error ? 'error' : 'suspicious-empty',
                    error,
                });
                if (healed) {
                    activeConfig = healed;
                    const retry = await runOnce(page, healed);
                    if (retry.error || !retry.raw) throw retry.error;
                    results = postProcess(retry.raw, activeConfig);
                } else if (error) {
                    throw error;
                } else {
                    // No hubo excepción, pero el resultado es basura (selectores
                    // desactualizados) y no hubo self-heal disponible/exitoso.
                    // Mejor fallar explícito que devolver datos con forma pero sin contenido real.
                    throw new Error(
                        `Resultado sospechoso para ${site}/${key}: los selectores probablemente están desactualizados`,
                    );
                }
            }

            if (activeConfig.kind === 'search') {
                // La tienda puede devolver resultados que no tienen nada que ver
                // (GOG muestra su catálogo cuando no encuentra nada; Fanatical
                // matchea por palabras sueltas). Nos quedamos solo con lo que
                // realmente se parece a lo buscado.
                if (term) {
                    results = filterByRelevance(results, term);
                }
                if (results.length === 0 && activeConfig.notFoundShape) {
                    return { [activeConfig.notFoundShape]: 'null' };
                }
            }

            return results;
        });
    }
}
