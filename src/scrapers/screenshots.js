// Screenshots para las listas del banner destacado. GOG e Instant Gaming
// embeben las URLs de su galería en el HTML del producto (fetch estático);
// Humble tiene API JSON pero Cloudflare bloquea el fetch de Node, así que
// se lee navegándola con el browser stealth; Fanatical no tiene API por
// producto ni SSR, así que se abre la página del juego y se toma la galería.
// Cada juego falla aislado (se queda sin screenshots) sin romper la lista.

const { withPage } = require("../browser/browser.manager");

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_SCREENSHOTS = 4;
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": USER_AGENT, "Accept-Language": "es,en;q=0.8" },
        });
        return res.ok ? res : null;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchText(url) {
    const res = await fetchWithTimeout(url);
    return res ? res.text() : null;
}

// Último segmento de path después de `marker`, sin query/hash. Sirve tanto
// para URLs absolutas como relativas.
function slugAfter(url, marker) {
    const idx = String(url || "").indexOf(marker);
    if (idx === -1) return null;
    const slug = String(url).slice(idx + marker.length).split(/[/?#]/)[0];
    return slug || null;
}

const extractors = {
    // El HTML del producto embebe "screenshots":[{"imageUrl":...}] (JSON del
    // productcard). El hash base se sirve con sufijo de variante de tamaño.
    gog: async (game) => {
        const html = await fetchText(game.url);
        const match = html && html.match(/"screenshots":\[(.*?)\]/);
        if (!match) return [];
        return [...match[1].matchAll(/"imageUrl":"([^"]+)"/g)].map(
            (m) => `${m[1].replace(/\\\//g, "/")}_product_card_v2_mobile_slider_639.jpg`
        );
    },

    // El HTML del producto lista la galería en gaming-cdn.com; se toman las
    // variantes base "-wallpaper-N.jpg" (sin sufijo -small/-medium/etc.).
    "instant-gaming": async (game) => {
        const html = await fetchText(game.url);
        if (!html) return [];
        const found =
            html.match(/https:\/\/gaming-cdn\.com\/images\/products\/\d+\/screenshot\/[^"'\s)]+/g) || [];
        const full = found.filter((u) => /-wallpaper-\d+\.jpg(\?v=\d+)?$/.test(u));
        return [...new Set(full)];
    },

    // API de la Humble Store (carousel_content.screenshot trae URLs
    // completas de imgix). Cloudflare devuelve 403 al fetch de Node, así
    // que se navega con el browser stealth y se lee el JSON del body.
    humble: async (game) => {
        const slug = slugAfter(game.url, "/store/");
        if (!slug) return [];
        return withPage(async (page) => {
            await page.goto(
                `https://www.humblebundle.com/store/api/lookup?products%5B%5D=${encodeURIComponent(slug)}&request=1`,
                { waitUntil: "domcontentloaded", timeout: 20000 }
            );
            const body = await page.evaluate(() => document.body.innerText);
            return JSON.parse(body)?.result?.[0]?.carousel_content?.screenshot || [];
        });
    },

    // Fanatical renderiza todo en cliente: se abre la página del juego y se
    // toman las imágenes de la galería (product/original/{uuid}), quitando
    // la portada y pidiéndole a imgix un tamaño grande.
    fanatical: async (game) => {
        const coverId = (String(game.imgUrl || "").match(/product\/original\/([^?]+)/) || [])[1];
        const rendered = await withPage(async (page) => {
            await page.goto(game.url, { waitUntil: "networkidle2", timeout: 45000 });
            return page.evaluate(() =>
                Array.from(document.querySelectorAll("img"))
                    .map((img) => img.currentSrc || img.src || "")
                    .filter((src) => src.includes("/product/original/"))
            );
        });
        const seen = new Set();
        const shots = [];
        for (const src of rendered) {
            const file = (src.match(/product\/original\/([^?]+)/) || [])[1];
            if (!file || file === coverId || seen.has(file)) continue;
            seen.add(file);
            shots.push(
                `https://fanatical.imgix.net/product/original/${file}?auto=compress,format&w=850&fit=crop`
            );
        }
        return shots;
    },
};

// Añade `screenshots` (máx. 4) a cada juego de la lista que no las tenga.
// Corre en paralelo: son fetches HTTP livianos, sin pestañas de browser.
async function enrichScreenshots(games, site) {
    const extract = extractors[site];
    if (!extract || !Array.isArray(games)) return games;
    return Promise.all(
        games.map(async (game) => {
            if (Array.isArray(game.screenshots) && game.screenshots.length > 0) return game;
            try {
                const shots = await extract(game);
                return shots.length > 0
                    ? { ...game, screenshots: shots.slice(0, MAX_SCREENSHOTS) }
                    : game;
            } catch {
                return game;
            }
        })
    );
}

module.exports = { enrichScreenshots };
