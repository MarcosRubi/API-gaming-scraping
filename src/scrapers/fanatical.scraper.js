const { scrapeConfigured } = require("./engine");
const { enrichScreenshots } = require("./screenshots");

const scrapeFanaticalSearch = (term) => scrapeConfigured("fanatical", "search", { term });
// Los más vendidos son los "destacados" de Fanatical y alimentan el banner:
// se enriquecen con screenshots de su API pública (/api/all/{slug}).
const scrapeFanaticalTopSellers = async () => {
    const games = await scrapeConfigured("fanatical", "top-sellers-fanatical");
    return enrichScreenshots(games, "fanatical");
};
const scrapeFanaticalNewReleases = () => scrapeConfigured("fanatical", "new-releases-fanatical");
const scrapeFanaticalTopOffers = () => scrapeConfigured("fanatical", "top-offers-fanatical");

module.exports = {
    scrapeFanaticalSearch,
    scrapeFanaticalTopSellers,
    scrapeFanaticalNewReleases,
    scrapeFanaticalTopOffers,
};
