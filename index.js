const cors = require('cors')
const express = require("express");
const app = express();
const morgan = require("morgan");
const Game = require('./src/game.controller')


//Configuraciones
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

//Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors())

//Routes
app.get("/steam/:game", Game.getSteam);
app.get("/gog/:game", Game.getGog);
app.get("/instant-gaming/:game", Game.getInstantGaming);

app.get("/top-sellers-steam", Game.getSteamTopSellers);
app.get("/top-offers-steam", Game.getSteamTopOffers);
app.get("/new-releases-steam", Game.getSteamNewReleases);

app.get("/top-sellers-gog", Game.getGogTopSellers);
app.get("/new-releases-gog", Game.getGogNewReleases);

//Iniciando el servidor
app.listen(app.get("port"), () => {
    console.log(`Server listening on port ${app.get("port")}`);
});
