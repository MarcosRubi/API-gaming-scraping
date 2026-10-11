const { scrapeConfigured } = require("./engine");
const { enrichScreenshots } = require("./screenshots");

const scrapeInstantGamingSearch = (term) => scrapeConfigured("instant-gaming", "search", { term });
const scrapeInstantGamingTopSellers = () => scrapeConfigured("instant-gaming", "top-sellers-instant-gaming");
const scrapeInstantGamingTopOffers = () => scrapeConfigured("instant-gaming", "top-offers-instant-gaming");
const scrapeInstantGamingTopIndieGames = () => scrapeConfigured("instant-gaming", "top-indie-games-instant-gaming");
// Alimenta el banner destacado: con screenshots de la página del producto.
const scrapeInstantGamingBestRated = async () => {
    const games = await scrapeConfigured("instant-gaming", "best-rated-instant-gaming");
    return enrichScreenshots(games, "instant-gaming");
};

module.exports = {
    scrapeInstantGamingSearch,
    scrapeInstantGamingTopSellers,
    scrapeInstantGamingTopOffers,
    scrapeInstantGamingTopIndieGames,
    scrapeInstantGamingBestRated,
};
