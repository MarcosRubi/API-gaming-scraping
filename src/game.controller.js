const puppeteer = require("puppeteer");
const jsdom = require("jsdom");

const Game = {
    getSteamTopSellers: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/?l=spanish`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll(
                    "#tab_topsellers_content .tab_content_items a"
                );
                let results = [];

                games.forEach((game, index) => {
                    if(index > 7){return}
                    let name = game.querySelector(".tab_item_name").textContent;
                    let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let price = game.querySelector(".discount_final_price") ? game.querySelector(".discount_final_price").textContent : '';
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).send(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getSteamTopOffers: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/?l=spanish`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll(
                    "#tab_specials_content a"
                );
                let results = [];

                games.forEach((game, index) => {
                    if(index > 7){return}
                    let name = game.querySelector(".tab_item_name").textContent;
                    let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let price = game.querySelector(".discount_final_price") ? game.querySelector(".discount_final_price").textContent : '';
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).send(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getSteamNewReleases: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/?l=spanish`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll(
                    "#tab_newreleases_content a"
                );
                let results = [];

                games.forEach((game, index) => {
                    if(index > 7){return}
                    let name = game.querySelector(".tab_item_name").textContent;
                    let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let price = game.querySelector(".discount_final_price") ? game.querySelector(".discount_final_price").textContent : '';
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).send(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getSteam: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/search/?term=${req.params.game}`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                // Seleccionamos los títulos y lo mostramos en consola
                let notFound = document.querySelector("#search_resultsRows a");
                if (notFound === null) {
                    res.status(200).json({ steam: "null" });
                    return;
                }
                let name = document.querySelector(
                    "#search_resultsRows a .title"
                ).textContent;
                let imgUrl = document.querySelector(
                    "#search_resultsRows a img"
                ).src;
                let price = document
                    .querySelector("#search_resultsRows a .search_price")
                    .textContent.trim()
                    .split("$")
                    .splice(1);
                let discount = document
                    .querySelector("#search_resultsRows a .search_discount")
                    .textContent.trim();
                let url = document.querySelector("#search_resultsRows a").href;
                const data = {
                    name,
                    imgUrl,
                    price,
                    discount,
                    url,
                };

                res.status(200).json(data);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getGog: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.gog.com/en/games?query=${req.params.game}`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                // Seleccionamos los títulos y lo mostramos en consola
                let notFound = document.querySelector(
                    ".product-tile.product-tile--grid"
                );
                if (notFound === null) {
                    res.status(200).json({ gog: "null" });
                    return;
                }
                let name = document.querySelector(".product-tile__title").title;
                let imgUrl = document
                    .querySelector(".product-tile.product-tile--grid source")
                    .srcset.split(",")[0];
                let price = document
                    .querySelector("price-value")
                    .textContent.trim()
                    .split("$")
                    .splice(1);
                let discount =
                    document
                        .querySelector("price-value")
                        .textContent.trim()
                        .split("$")
                        .splice(1).length === 1
                        ? ""
                        : document
                              .querySelector("price-discount")
                              .textContent.trim();
                let url = document.querySelector(
                    ".product-tile.product-tile--grid"
                ).href;
                const data = {
                    name,
                    imgUrl,
                    price,
                    discount,
                    url,
                };

                res.status(200).json(data);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getInstantGaming: (req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.instant-gaming.com/es/busquedas/?platform%5B%5D=1&type%5B%5D=&sort_by=bestsellers_desc&min_reviewsavg=10&max_reviewsavg=100&noreviews=1&min_price=0&max_price=100&noprice=1&gametype=games&query=${req.params.game}`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                // res.status(200).send(body)

                // Seleccionamos los títulos y lo mostramos en consola
                let notFound = document.querySelector(".search .item .title");
                if (notFound === null) {
                    res.status(200).json({ instantGaming: "null" });
                    return;
                }
                let name = document.querySelector(
                    ".search .item .title"
                ).textContent;
                let imgUrl = document.querySelector(".search .item .picture")
                    .attributes[1].textContent;
                let price = document
                    .querySelector(".search .item .price")
                    .textContent.split("€")[0];
                let discount = document.querySelector(
                    ".search .item a .discount"
                ).textContent;
                let url = document.querySelector(".search .item a").href;
                const data = {
                    name,
                    imgUrl,
                    price,
                    discount,
                    url,
                };

                res.status(200).json(data);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
};

module.exports = Game;
