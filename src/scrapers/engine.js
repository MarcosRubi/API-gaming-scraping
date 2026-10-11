const { withPage } = require("../browser/browser.manager");
const { collectListItems } = require("./collect");
const { filterByRelevance } = require("./relevance");
const selectorStore = require("../config/selector-store");
const selfHeal = require("../self-heal");

function buildUrl(config, term) {
    if (!config.url.includes("{term}")) return config.url;
    return config.url.replace("{term}", encodeURIComponent(term || ""));
}

// Decide si el resultado de un scrape amerita disparar self-heal: un error
// tirado ya lo cubre aparte; esto cubre el caso más traicionero, "no tiró
// error pero el resultado es basura" (contenedor vacío en un listado, o
// items sin nombre/url porque el selector apunta a otra cosa).
function isSuspicious(raw, results, config) {
    if (!raw) return true;
    if (raw.matchedCount === 0) {
        // Una búsqueda puede legítimamente no tener resultados; un listado no.
        return config.kind === "listing";
    }
    const allMissingCore = results.every((r) => !r.name || !r.url);
    if (allMissingCore) return true;
    if (config.kind === "listing" && results.length < (config.expectedMin || 1)) return true;
    return false;
}

// Cada tienda escribe el precio a su manera ("$24.99", "US$14.99", "16,09€").
// Normalizamos todos a "US$X.XX" / "EU€X.XX" según config.currency para que
// la UI sea consistente. Textos sin dígitos ("Gratis", "Free To Play",
// "No encontrado") pasan tal cual.
function formatPrice(value, config) {
    if (!value) return value;
    const match = String(value).replace(",", ".").match(/\d+(\.\d+)?/);
    if (!match) return value;
    return config.currency === "EUR" ? `EU€${match[0]}` : `US$${match[0]}`;
}

function assemblePrice(item, config) {
    if (item.priceOld) {
        let now = item.price || "";
        if (now.includes(item.priceOld)) now = now.replace(item.priceOld, "").trim();
        return [{ now: formatPrice(now, config) }, { old: formatPrice(item.priceOld, config) }];
    }
    if (item.price) {
        return [{ now: formatPrice(item.price, config) }];
    }
    return [{ now: config.fallbackPriceText || "No encontrado" }];
}

function postProcess(raw, config) {
    return raw.items.map((item) => {
        const out = {
            name: item.name,
            imgUrl: item.imgUrl,
            price: assemblePrice(item, config),
            discount: item.discount || "",
            url: item.url,
        };
        if (item.categories) {
            out.categories = String(item.categories)
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
        }
        if (item.reviews) {
            out.reviews = item.reviews;
        }
        if (item.url) {
            const appIdMatch = String(item.url).match(/\/app\/(\d+)/);
            if (appIdMatch) {
                out.appId = appIdMatch[1];
            }
        }
        return out;
    });
}

async function runOnce(page, config) {
    try {
        const raw = await page.evaluate(collectListItems, config);
        return { raw, error: null };
    } catch (error) {
        return { raw: null, error };
    }
}

async function scrapeConfigured(site, key, opts = {}) {
    const config = selectorStore.getConfig(site, key);
    if (!config) throw new Error(`No hay configuración de selectores para ${site}/${key}`);

    return withPage(async (page) => {
        const url = buildUrl(config, opts.term);
        await page.goto(url, { waitUntil: config.waitUntil || "domcontentloaded", timeout: 30000 });
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
            const suspicious = !error;
            const healed = await selfHeal.maybeHeal({
                site,
                key,
                page,
                config,
                reason: error ? "error" : "suspicious-empty",
                error,
            });
            if (healed) {
                activeConfig = healed;
                const retry = await runOnce(page, healed);
                if (retry.error) throw retry.error;
                raw = retry.raw;
                results = postProcess(raw, activeConfig);
            } else if (error) {
                throw error;
            } else if (suspicious) {
                // No hubo excepción, pero el resultado es basura (selectores
                // desactualizados) y no hubo self-heal disponible/exitoso.
                // Mejor fallar explícito que devolver datos con forma pero sin contenido real.
                throw new Error(`Resultado sospechoso para ${site}/${key}: los selectores probablemente están desactualizados`);
            }
        }

        if (activeConfig.kind === "search") {
            // La tienda puede devolver resultados que no tienen nada que ver
            // (GOG muestra su catálogo cuando no encuentra nada; Fanatical
            // matchea por palabras sueltas). Nos quedamos solo con lo que
            // realmente se parece a lo buscado.
            if (opts.term) {
                results = filterByRelevance(results, opts.term);
            }
            if (results.length === 0 && activeConfig.notFoundShape) {
                return { [activeConfig.notFoundShape]: "null" };
            }
        }

        return results;
    });
}

module.exports = { scrapeConfigured };
