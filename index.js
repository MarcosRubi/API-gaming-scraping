require('dotenv').config()
const cors = require('cors')
const express = require("express");
const app = express();
const morgan = require("morgan");
const Game = require('./src/game.controller')
const wrapAsync = require('./src/utils/async-handler')
const { initBrowser, closeBrowser } = require('./src/browser/browser.manager')
const cacheStore = require('./src/cache/store')
const scheduler = require('./src/cache/scheduler')
const selectorStore = require('./src/config/selector-store')


//Configuraciones
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

//Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';

//En producción solo el frontend publicado; en dev los puertos locales de Vite y de la propia API.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
    : isProduction
        ? ['https://games-scraping.mrubi.dev']
        : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
    //Sin cabecera Origin/Referer (curl, navegador directo): permitido en dev, bloqueado en producción.
    if (!origin) {
        if (isProduction) return res.status(403).json({ error: 'Forbidden: invalid origin' });
        return next();
    }
    if (!ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) {
        return res.status(403).json({ error: 'Forbidden: invalid origin' });
    }
    next();
});

//Routes
app.get("/",  (req, res) => res.status(200).send('Hello'));

app.get("/steam/:game", wrapAsync(Game.getSteam));
app.get("/gog/:game", wrapAsync(Game.getGog));
app.get("/instant-gaming/:game", wrapAsync(Game.getInstantGaming));
app.get("/humble/:game", wrapAsync(Game.getHumble));
app.get("/fanatical/:game", wrapAsync(Game.getFanatical));

app.get("/top-sellers-steam", wrapAsync(Game.getSteamTopSellers));
app.get("/top-offers-steam", wrapAsync(Game.getSteamTopOffers));
app.get("/new-releases-steam", wrapAsync(Game.getSteamNewReleases));
app.get("/overwhelmingly-positive-steam", wrapAsync(Game.getSteamOverwhelminglyPositive));

app.get("/top-sellers-gog", wrapAsync(Game.getGogTopSellers));
app.get("/top-old-games-gog", wrapAsync(Game.getGogGoodOldGames));
app.get("/new-releases-gog", wrapAsync(Game.getGogNewReleases));
app.get("/best-rated-gog", wrapAsync(Game.getGogBestRated));

app.get("/top-sellers-instant-gaming", wrapAsync(Game.getInstantGamingTopSellers));
app.get("/top-offers-instant-gaming", wrapAsync(Game.getInstantGamingTopOffers));
app.get("/top-indie-games-instant-gaming", wrapAsync(Game.getInstantGamingTopIndieGames));
app.get("/best-rated-instant-gaming", wrapAsync(Game.getInstantGamingBestRated));

app.get("/top-sellers-humble", wrapAsync(Game.getHumbleTopSellers));
app.get("/new-releases-humble", wrapAsync(Game.getHumbleNewReleases));
app.get("/top-offers-humble", wrapAsync(Game.getHumbleTopOffers));

app.get("/top-sellers-fanatical", wrapAsync(Game.getFanaticalTopSellers));
app.get("/new-releases-fanatical", wrapAsync(Game.getFanaticalNewReleases));
app.get("/top-offers-fanatical", wrapAsync(Game.getFanaticalTopOffers));

//Iniciando el servidor: primero el browser persistente y la caché de disco,
//luego el server (para no bloquear /steam,/gog,/instant-gaming en el boot),
//y por último el warm-up inicial + el cron periódico en paralelo.
async function bootstrap() {
    await initBrowser();
    await cacheStore.loadFromDisk();
    await selectorStore.loadFromDisk();

    app.listen(app.get("port"), () => {
        console.log(`Server listening on port ${app.get("port")}`);
    });

    scheduler.runAll().catch((err) => console.error("[bootstrap] warm-up inicial de caché falló", err));
    scheduler.start();
}

bootstrap().catch((err) => {
    console.error("Fatal error during bootstrap", err);
    process.exit(1);
});

async function shutdown(signal) {
    console.log(`${signal} recibido, cerrando servidor y browser...`);
    await closeBrowser();
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
