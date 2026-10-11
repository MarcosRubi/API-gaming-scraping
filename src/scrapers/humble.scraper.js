const { scrapeConfigured } = require("./engine");
const { enrichScreenshots } = require("./screenshots");

const scrapeHumbleSearch = (term) => scrapeConfigured("humble", "search", { term });
// Los más vendidos son los "destacados" de Humble y alimentan el banner:
// se enriquecen con screenshots de su API pública de lookup.
const scrapeHumbleTopSellers = async () => {
    const games = await scrapeConfigured("humble", "top-sellers-humble");
    return enrichScreenshots(games, "humble");
};
const scrapeHumbleNewReleases = () => scrapeConfigured("humble", "new-releases-humble");
const scrapeHumbleTopOffers = () => scrapeConfigured("humble", "top-offers-humble");

module.exports = {
    scrapeHumbleSearch,
    scrapeHumbleTopSellers,
    scrapeHumbleNewReleases,
    scrapeHumbleTopOffers,
};
