// Enriquecimiento de categorías por juego. Fuentes, en orden de costo:
//   1. Ya vienen del tile (Steam home tabs) → solo se normalizan.
//   2. Cache persistente por URL (data/categories-cache.json).
//   3. Steam: API JSON appdetails por appid parseado de la URL (sin browser).
//   4. GOG / Instant Gaming / Fanatical: visita a la página de producto con
//      el browser persistente (solo listados del cron, no búsquedas).
//   5. Fallback (Humble y fallidos): buscar el juego en la API de Steam por
//      nombre y usar sus géneros, validando similitud de nombres.
const { withPage } = require("../browser/browser.manager");
const { normalizeCategories } = require("./normalize");
const cache = require("./cache");

// Selectores de géneros en la página de producto (sondeados en vivo).
const SITE_DETAIL = {
    gog: { selector: ".details__link[href*='genres']" },
    "instant-gaming": { selector: ".genres a" },
    fanatical: { selector: ".product-details a[href*='/categories/']" },
};

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function steamGenresByAppId(appId) {
    const data = await fetchJson(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&l=spanish&filters=genres`
    );
    const genres = data?.[appId]?.data?.genres;
    return Array.isArray(genres) ? genres.map((g) => g.description) : [];
}

function parseSteamAppId(url) {
    const match = String(url || "").match(/\/app\/(\d+)/);
    return match ? match[1] : null;
}

// Nombre "comparable": minúsculas y solo alfanuméricos, para validar que lo
// que devolvió la búsqueda de Steam es realmente el mismo juego.
function comparable(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarNames(a, b) {
    const ca = comparable(a);
    const cb = comparable(b);
    if (!ca || !cb) return false;
    return ca.includes(cb) || cb.includes(ca);
}

// Los sufijos de edición hacen fallar la búsqueda exacta en Steam
// ("X Deluxe Edition" no existe como app, "X" sí — y comparte géneros).
function stripEdition(name) {
    return String(name || "")
        .replace(/\b(deluxe|ultimate|gold|standard|definitive|complete|goty|premium)\b/gi, "")
        .replace(/\bedition\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Fallback por nombre: la mayoría del catálogo de Humble/Fanatical son keys
// de Steam, así que sus géneros aplican. Si el primer resultado no se parece
// al nombre buscado, mejor sin categorías que con las de otro juego.
async function steamGenresByName(name) {
    const term = stripEdition(name);
    if (!term) return [];
    const data = await fetchJson(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=US&l=spanish`
    );
    const first = data?.items?.[0];
    if (!first || !similarNames(first.name, term)) return [];
    return steamGenresByAppId(first.id);
}

async function scrapeDetailGenres(site, url) {
    const detail = SITE_DETAIL[site];
    if (!detail || !url) return [];
    return withPage(async (page) => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForSelector(detail.selector, { timeout: 7000 }).catch(() => {});
        return page.evaluate((selector) => {
            return Array.from(document.querySelectorAll(selector))
                .slice(0, 8)
                .map((el) => el.textContent.trim());
        }, detail.selector);
    }).catch(() => []);
}

async function resolveCategories(site, item, allowBrowser) {
    const cached = cache.get(item.url);
    // Re-normalizar el hit: si la tabla de normalización ganó mapeos nuevos
    // desde que se cacheó, se aplican sin esperar a que expire el TTL.
    if (cached) return normalizeCategories(cached);

    let raw = [];
    if (site === "steam") {
        const appId = parseSteamAppId(item.url);
        if (appId) raw = await steamGenresByAppId(appId);
    } else if (SITE_DETAIL[site] && allowBrowser) {
        raw = await scrapeDetailGenres(site, item.url);
    }
    if (raw.length === 0 && site !== "steam") {
        raw = await steamGenresByName(item.name);
    }

    const categories = normalizeCategories(raw);
    // En modo sin browser no cacheamos los vacíos de sitios scrapeables: el
    // próximo cron (con browser) debe poder intentar la página de producto.
    if (categories.length > 0 || site === "steam" || allowBrowser || !SITE_DETAIL[site]) {
        cache.set(item.url, categories);
    }
    return categories;
}

// Muta cada item agregándole `categories: string[]`. `allowBrowser: false`
// (búsquedas) evita visitas de página para no sumar segundos de latencia:
// usa tiles, cache y APIs JSON solamente.
async function enrichCategories(items, site, { allowBrowser = true } = {}) {
    if (!Array.isArray(items) || items.length === 0) return items;
    await cache.load();

    for (const item of items) {
        try {
            if (Array.isArray(item.categories) && item.categories.length > 0) {
                item.categories = normalizeCategories(item.categories);
                if (item.url) cache.set(item.url, item.categories);
            } else {
                item.categories = await resolveCategories(site, item, allowBrowser);
            }
        } catch (err) {
            item.categories = [];
        }
    }

    await cache.persist();
    return items;
}

module.exports = { enrichCategories };
