const express = require("express");
const app = express();
const morgan = require("morgan");
const Game = require('./game.controller')

//Configuraciones
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

//Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Routes
app.get("/game/:game", Game.get);
app.get("/games", Game.list);


//Iniciando el servidor
app.listen(app.get("port"), () => {
    console.log(`Server listening on port ${app.get("port")}`);
});
