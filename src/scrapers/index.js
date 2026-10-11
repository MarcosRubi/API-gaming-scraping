const steam = require("./steam.scraper");
const gog = require("./gog.scraper");
const instantGaming = require("./instant-gaming.scraper");
const humble = require("./humble.scraper");
const fanatical = require("./fanatical.scraper");

// Los endpoints "de listado" (sin parámetros) que el scheduler refresca periódicamente.
module.exports = [
    { key: "top-sellers-steam", fn: steam.scrapeSteamTopSellers },
    { key: "top-offers-steam", fn: steam.scrapeSteamTopOffers },
    { key: "new-releases-steam", fn: steam.scrapeSteamNewReleases },
    { key: "overwhelmingly-positive-steam", fn: steam.scrapeSteamOverwhelminglyPositive },

    { key: "top-sellers-gog", fn: gog.scrapeGogTopSellers },
    { key: "top-old-games-gog", fn: gog.scrapeGogGoodOldGames },
    { key: "new-releases-gog", fn: gog.scrapeGogNewReleases },
    { key: "best-rated-gog", fn: gog.scrapeGogBestRated },

    { key: "top-sellers-instant-gaming", fn: instantGaming.scrapeInstantGamingTopSellers },
    { key: "top-offers-instant-gaming", fn: instantGaming.scrapeInstantGamingTopOffers },
    { key: "top-indie-games-instant-gaming", fn: instantGaming.scrapeInstantGamingTopIndieGames },
    { key: "best-rated-instant-gaming", fn: instantGaming.scrapeInstantGamingBestRated },

    { key: "top-sellers-humble", fn: humble.scrapeHumbleTopSellers },
    { key: "new-releases-humble", fn: humble.scrapeHumbleNewReleases },
    { key: "top-offers-humble", fn: humble.scrapeHumbleTopOffers },

    { key: "top-sellers-fanatical", fn: fanatical.scrapeFanaticalTopSellers },
    { key: "new-releases-fanatical", fn: fanatical.scrapeFanaticalNewReleases },
    { key: "top-offers-fanatical", fn: fanatical.scrapeFanaticalTopOffers },
];
