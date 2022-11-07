const puppeteer = require("puppeteer");
const jsdom = require("jsdom");

const Game = {
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
    
                let games = document.querySelectorAll('#search_resultsRows a')
                let results = []
    
                games.forEach((game, index) => {
                    if(index > 4){return}
    
                    let name = game.querySelector("#search_resultsRows a .title").textContent;
                    let imgUrl = game.querySelector("#search_resultsRows a img").src;
                    let price = game.querySelector('.search_price strike')
                        ? [{now:`$${game.querySelector('.search_price').textContent.trim().split('$').slice(2,3)[0]}`}, {old:game.querySelector('.search_price strike').textContent}]
                        : [{now:game.querySelector('.search_price').textContent.trim()}]
                    let discount = game.querySelector(".search_discount").textContent.trim()
                    let url = game.href
    
                    results.push({name, imgUrl, price, discount, url})
                });
    
                res.status(200).json(results);
    
                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
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
                    let price = game.querySelector('.discount_original_price') ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] : [game.querySelector(".discount_final_price") ? {now:game.querySelector(".discount_final_price").textContent} : '']
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
                    let price = game.querySelector('.discount_original_price') ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] : [game.querySelector(".discount_final_price") ? {now:game.querySelector(".discount_final_price").textContent} : '']
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
                    let price = game.querySelector('.discount_original_price') ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] : [game.querySelector(".discount_final_price") ? {now:game.querySelector(".discount_final_price").textContent} : '']
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
                let notFound = document.querySelector(".product-tile.product-tile--grid");
                if (notFound === null) {
                    res.status(200).json({ gog: "null" });
                    return;
                }

                let games = document.querySelectorAll('.paginated-products-grid product-tile')
                let results = []

                games.forEach((game, index) => {
                    if(index>4){return}

                    let name = game.querySelector(".product-tile__title").title;
                    let imgUrl = game.querySelector(".product-tile.product-tile--grid source").srcset.split(",")[0];
                    let price = game.querySelector("price-value") ? game.querySelector("price-value").textContent.trim().split("$").splice(1) : ['Gratis'];
                    let discount = price.length === 1 ? "" : game.querySelector("price-discount").textContent.trim();
                    let url = game.querySelector(".product-tile.product-tile--grid").href;

                    results.push({name, imgUrl, price, discount, url})
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getGogTopSellers:(req, res) => {
        (async () => {
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url de google
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.gog.com/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll('.discover-games__products .product-tile')
                let results = [];

                games.forEach((game, index) => {
                    if(index > 7){return}

                    let name = game.querySelector(".product-tile__title").textContent;
                    let imgUrl = game.querySelector("picture source").getAttribute('lazy-srcset').trim().split('\n')[0]
                    let price = game.querySelector('.product-tile__price') 
                        ? [{now:game.querySelector('.product-tile__price-discounted').textContent.trim()},{old:game.querySelector(".product-tile__price").textContent}] 
                        : [{now:game.querySelector('.product-tile__price-discounted').textContent}]
                    let discount = game.querySelector(".product-tile__discount") ? game.querySelector(".product-tile__discount").textContent : ''
                    let url = `https://www.gog.com${game.querySelector('a').href}`;

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

                let games = document.querySelectorAll('.search.listing-games .item')
                let results = []

                games.forEach((game, index) => {
                    if(index > 4){return} //Limitando a 5 resultados

                    let name = game.querySelector(".title").textContent;
                    let imgUrl = game.querySelector(".picture").attributes[1].textContent;
                    let price = `${game.querySelector(".price").textContent.split("€")[0]}€`;
                    let discount = game.querySelector(".discount").textContent;
                    let url = game.querySelector("a").href;
                    
                    results.push({name, imgUrl, price, discount, url})
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
};

module.exports = Game;
