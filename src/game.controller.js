const steam = require("./scrapers/steam.scraper");
const gog = require("./scrapers/gog.scraper");
const instantGaming = require("./scrapers/instant-gaming.scraper");
const humble = require("./scrapers/humble.scraper");
const fanatical = require("./scrapers/fanatical.scraper");
const store = require("./cache/store");
const { refreshOne } = require("./cache/scheduler");
const { enrichCategories } = require("./categories/enrich");

// Sirve un endpoint de listado desde la caché. Si la clave nunca se scrapeó
// con éxito (primer boot sin snapshot, o el último intento del cron falló),
// hace un scrape puntual de esa clave -- si también falla, el error sube al
// wrapAsync del router y responde con un 502 real en vez de servir null.
async function serveCached(req, res, key) {
    let entry = store.get(key);
    if (!entry || entry.data === null) {
        const data = await refreshOne(key);
        entry = { data, updatedAt: Date.now() };
    }
    res.set("X-Cache-Updated-At", new Date(entry.updatedAt).toISOString());
    res.status(200).json(entry.data);
}

// En búsquedas el enrich corre sin browser (cache + APIs JSON de Steam):
// suma milisegundos, no visitas de página, y enrichCategories devuelve el
// shape "no encontrado" ({site: "null"}) intacto porque no es un array.
const Game = {
    getSteam: async (req, res) => {
        const results = await steam.scrapeSteamSearch(req.params.game);
        await enrichCategories(results, "steam", { allowBrowser: false });
        res.status(200).json(results);
    },
    getGog: async (req, res) => {
        const results = await gog.scrapeGogSearch(req.params.game);
        await enrichCategories(results, "gog", { allowBrowser: false });
        res.status(200).json(results);
    },
    getInstantGaming: async (req, res) => {
        const results = await instantGaming.scrapeInstantGamingSearch(req.params.game);
        await enrichCategories(results, "instant-gaming", { allowBrowser: false });
        res.status(200).json(results);
    },
    getHumble: async (req, res) => {
        const results = await humble.scrapeHumbleSearch(req.params.game);
        await enrichCategories(results, "humble", { allowBrowser: false });
        res.status(200).json(results);
    },
    getFanatical: async (req, res) => {
        const results = await fanatical.scrapeFanaticalSearch(req.params.game);
        await enrichCategories(results, "fanatical", { allowBrowser: false });
        res.status(200).json(results);
    },

    getSteamTopSellers: (req, res) => serveCached(req, res, "top-sellers-steam"),
    getSteamTopOffers: (req, res) => serveCached(req, res, "top-offers-steam"),
    getSteamNewReleases: (req, res) => serveCached(req, res, "new-releases-steam"),
    getSteamOverwhelminglyPositive: (req, res) => serveCached(req, res, "overwhelmingly-positive-steam"),

    getGogTopSellers: (req, res) => serveCached(req, res, "top-sellers-gog"),
    getGogGoodOldGames: (req, res) => serveCached(req, res, "top-old-games-gog"),
    getGogNewReleases: (req, res) => serveCached(req, res, "new-releases-gog"),
    getGogBestRated: (req, res) => serveCached(req, res, "best-rated-gog"),

    getInstantGamingTopSellers: (req, res) => serveCached(req, res, "top-sellers-instant-gaming"),
    getInstantGamingTopOffers: (req, res) => serveCached(req, res, "top-offers-instant-gaming"),
    getInstantGamingTopIndieGames: (req, res) => serveCached(req, res, "top-indie-games-instant-gaming"),
    getInstantGamingBestRated: (req, res) => serveCached(req, res, "best-rated-instant-gaming"),

    getHumbleTopSellers: (req, res) => serveCached(req, res, "top-sellers-humble"),
    getHumbleNewReleases: (req, res) => serveCached(req, res, "new-releases-humble"),
    getHumbleTopOffers: (req, res) => serveCached(req, res, "top-offers-humble"),

    getFanaticalTopSellers: (req, res) => serveCached(req, res, "top-sellers-fanatical"),
    getFanaticalNewReleases: (req, res) => serveCached(req, res, "new-releases-fanatical"),
    getFanaticalTopOffers: (req, res) => serveCached(req, res, "top-offers-fanatical"),
};

module.exports = Game;
