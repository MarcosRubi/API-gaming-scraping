const cors = require("cors");
const express = require("express");
const app = express();
const morgan = require("morgan");
const Game = require("./src/game.controller");

//Configuraciones
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

//Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors());

//Routes
app.get("/", (req, res) => res.status(200).send("Hello"));

app.get("/steam/:game", Game.getSteam);
app.get("/gog/:game", Game.getGog);
app.get("/instant-gaming/:game", Game.getInstantGaming);

app.get("/top-sellers-steam", Game.getSteamTopSellers);
app.get("/top-offers-steam", Game.getSteamTopOffers);
app.get("/new-releases-steam", Game.getSteamNewReleases);

app.get("/top-sellers-gog", Game.getGogTopSellers);
app.get("/top-old-games-gog", Game.getGogGoodOldGames);
app.get("/new-releases-gog", Game.getGogNewReleases);

app.get("/top-sellers-instant-gaming", Game.getInstantGamingTopSellers);
app.get("/top-offers-instant-gaming", Game.getInstantGamingTopOffers);
app.get("/top-indie-games-instant-gaming", Game.getInstantGamingTopIndieGames);

//Iniciando el servidor
app.listen(app.get("port"), () => {
    console.log(`Server listening on port ${app.get("port")}`);
});
