const { scrapeConfigured } = require("./engine");

const scrapeSteamSearch = (term) => scrapeConfigured("steam", "search", { term });
const scrapeSteamTopSellers = () => scrapeConfigured("steam", "top-sellers-steam");
const scrapeSteamTopOffers = () => scrapeConfigured("steam", "top-offers-steam");
const scrapeSteamNewReleases = () => scrapeConfigured("steam", "new-releases-steam");

async function fetchSteamScreenshots(games) {
    const results = await Promise.all(
        games.map(async (game) => {
            if (!game.appId) return game;
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${game.appId}&l=spanish`,
                    { signal: controller.signal }
                );
                clearTimeout(timer);
                if (!res.ok) return game;
                const json = await res.json();
                const data = json?.[game.appId]?.data;
                if (!data) return game;
                const screenshots = (data.screenshots || [])
                    .slice(0, 4)
                    .map((s) => s.path_full);
                return {
                    ...game,
                    screenshots,
                    imgUrl: data.header_image || game.imgUrl,
                };
            } catch {
                return game;
            }
        })
    );
    return results;
}

const scrapeSteamOverwhelminglyPositive = async () => {
    const games = await scrapeConfigured("steam", "overwhelmingly-positive");
    return fetchSteamScreenshots(games);
};

module.exports = {
    scrapeSteamSearch,
    scrapeSteamTopSellers,
    scrapeSteamTopOffers,
    scrapeSteamNewReleases,
    scrapeSteamOverwhelminglyPositive,
};
