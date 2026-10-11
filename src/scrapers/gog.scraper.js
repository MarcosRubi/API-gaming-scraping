const { scrapeConfigured } = require("./engine");
const { enrichScreenshots } = require("./screenshots");

const scrapeGogSearch = (term) => scrapeConfigured("gog", "search", { term });
const scrapeGogTopSellers = () => scrapeConfigured("gog", "top-sellers-gog");
const scrapeGogNewReleases = () => scrapeConfigured("gog", "new-releases-gog");
const scrapeGogGoodOldGames = () => scrapeConfigured("gog", "top-old-games-gog");
// Alimenta el banner destacado: con screenshots de la página del producto.
const scrapeGogBestRated = async () => {
    const games = await scrapeConfigured("gog", "best-rated-gog");
    return enrichScreenshots(games, "gog");
};

module.exports = {
    scrapeGogSearch,
    scrapeGogTopSellers,
    scrapeGogNewReleases,
    scrapeGogGoodOldGames,
    scrapeGogBestRated,
};
