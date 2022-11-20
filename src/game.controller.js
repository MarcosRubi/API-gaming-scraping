const jsdom = require("jsdom");
let chrome = require('chrome-aws-lambda')
let puppeteer


if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
    puppeteer = require("puppeteer-core");
}else{
    puppeteer = require('puppeteer')
}



const Game = {
    getSteam: (req, res) => {
        (async () => {
            let options = {}
            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/search/?term=${req.params.game}`
                );
                const body = await response.text();
    
                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);
    
                // Validamos si encontro resultados
                let notFound = document.querySelector("#search_resultsRows a");
                if (notFound === null) {
                    res.status(200).json({ steam: "null" });
                    return;
                }
    
                let games = document.querySelectorAll('#search_resultsRows a')
                let results = []
    
                games.forEach((game, index) => {
                    if(index > 4){return} //Limitamos a 5 resultados
    
                    let name = game.querySelector("#search_resultsRows a .title").textContent;
                    let imgUrl = game.querySelector("#search_resultsRows a img").src;
                    let price = game.querySelector('.search_price strike')
                        ? [{now:`$${game.querySelector('.search_price').textContent.trim().split('$').slice(2,3)[0]}`}, {old:game.querySelector('.search_price strike').textContent}]
                        : game.querySelector('.search_price').textContent.trim()
                            ? [{now:game.querySelector('.search_price').textContent.trim()}]
                            : [{now:'$No encontrado'}]
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
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
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
                    if(index > 29){return} //Limitamos a 30 resultados
                    let name = game.querySelector(".tab_item_name").textContent;
                    let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let price = game.querySelector('.discount_original_price') 
                        ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] 
                        : [game.querySelector(".discount_final_price") 
                            ? {now:game.querySelector(".discount_final_price").textContent} 
                            : {now: '$No encontrado'}]
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getSteamTopOffers: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://store.steampowered.com/?l=spanish`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                document.getElementById('tab_specials_content_trigger').click()
                
                let games = document.querySelectorAll(
                    "#tab_specials_content a"
                );
                let results = [];

                games.forEach((game, index) => {
                    if(index > 29){return} //Limitamos a 30 resultados
                    let name = game.querySelector(".tab_item_name").textContent;
                    // let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let imgUrl = "";
                    let price = game.querySelector('.discount_original_price') ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] : [game.querySelector(".discount_final_price") ? {now:game.querySelector(".discount_final_price").textContent} : '']
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getSteamNewReleases: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
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
                    if(index > 29){return} //Limitamos a 30 resultados
                    let name = game.querySelector(".tab_item_name").textContent;
                    // let imgUrl = game.querySelector(".tab_item_cap img").src;
                    let imgUrl = "";
                    let price = game.querySelector('.discount_original_price') ? [{now:game.querySelector(".discount_final_price").textContent},{old:game.querySelector('.discount_original_price').textContent}] : [game.querySelector(".discount_final_price") ? {now:game.querySelector(".discount_final_price").textContent} : '']
                    let discount = game.querySelector(".discount_pct") ? game.querySelector(".discount_pct").textContent : ''
                    let url = game.href;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },

    getGog: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }
            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.gog.com/en/games?query=${req.params.game}`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                // Validamos si encontro resultados
                let notFound = document.querySelector(".product-tile.product-tile--grid");
                if (notFound === null) {
                    res.status(200).json({ gog: "null" });
                    return;
                }

                let games = document.querySelectorAll('.paginated-products-grid product-tile')
                let results = []

                games.forEach((game, index) => {
                    if(index>4){return} //Limitamos a 5 resultados

                    let name = game.querySelector(".product-tile__title").title;
                    let imgUrl = game.querySelector(".product-tile.product-tile--grid source").srcset.split(",")[0];
                    let price = game.querySelector("price-value") 
                        ? game.querySelector(".base-value") 
                            ? [{now:game.querySelector(".final-value").textContent},{old:game.querySelector(".base-value").textContent}]
                            : [{now:game.querySelector(".final-value").textContent}]
                        : [{now:'Gratis'}];
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
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
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
                    if(index > 29){return} //Limitamos a 30 resultados

                    let name = game.querySelector(".product-tile__title").textContent;
                    let imgUrl = game.querySelector("picture source").getAttribute('lazy-srcset').trim().split('\n')[0]
                    let price = game.querySelector('.product-tile__price').textContent 
                        ? [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`},{old:`$${game.querySelector(".product-tile__price").textContent}`}] 
                        : [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`}]
                    let discount = game.querySelector(".product-tile__discount") ? game.querySelector(".product-tile__discount").textContent : ''
                    let url = `https://www.gog.com${game.querySelector('a').href}`;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getGogNewReleases:(req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.gog.com/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);


                let games = document.querySelectorAll('.custom-section-collection')[5].querySelectorAll('.product-tile')
                let results = [];

                games.forEach((game, index) => {
                    if(index > 29){return} //Limitamos a 30 resultados

                    let name = game.querySelector(".product-tile__title").textContent;
                    let imgUrl = game.querySelector("picture source").getAttribute('lazy-srcset').trim().split('\n')[0]
                    let price = game.querySelector('.product-tile__price').textContent  
                        ? [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`},{old:`$${game.querySelector(".product-tile__price").textContent}`}] 
                        : [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`}]
                    let discount = game.querySelector(".product-tile__discount") ? game.querySelector(".product-tile__discount").textContent : ''
                    let url = `https://www.gog.com${game.querySelector('a').href}`;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },
    getGogGoodOldGames:(req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.gog.com/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll('.custom-section-collection')[2].querySelectorAll('.product-tile')
                let results = [];

                games.forEach((game, index) => {
                    if(index > 29){return} //Limitamos a 30 resultados

                    let name = game.querySelector(".product-tile__title").textContent;
                    let imgUrl = game.querySelector("picture source").getAttribute('lazy-srcset').trim().split('\n')[0]
                    let price = game.querySelector('.product-tile__price').textContent  
                        ? [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`},{old:`$${game.querySelector(".product-tile__price").textContent}`}] 
                        : [{now:`$${game.querySelector('.product-tile__price-discounted').textContent.trim()}`}]
                    let discount = game.querySelector(".product-tile__discount") ? game.querySelector(".product-tile__discount").textContent : ''
                    let url = `https://www.gog.com${game.querySelector('a').href}`;

                    results.push({name, imgUrl, price, discount, url});
                });

                res.status(200).json(results);

                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })();
    },

    getInstantGaming: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.instant-gaming.com/es/busquedas/?platform%5B%5D=1&type%5B%5D=&sort_by=bestsellers_desc&min_reviewsavg=10&max_reviewsavg=100&noreviews=1&min_price=0&max_price=100&noprice=1&gametype=games&query=${req.params.game}`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);


                // Validamos si encontro resultados
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
                    let price = [{now:`${game.querySelector(".price").textContent.split("€")[0]}`}];
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
    getInstantGamingTopSellers: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.instant-gaming.com/es/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll('.products-trending .item')
                let results = []

                games.forEach((game, index) => {
                    if(index > 4){return} //Limitando a 5 resultados

                    let name = game.querySelector(".title").textContent;
                    let imgUrl = game.querySelector(".picture").attributes[1].textContent;
                    let price = [{now:`${game.querySelector(".price").textContent}`}];
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
    getInstantGamingTopOffers: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.instant-gaming.com/es/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll('#promotions-home-block .item')
                let results = []

                games.forEach((game, index) => {
                    if(index > 4){return} //Limitando a 5 resultados

                    let name = game.querySelector(".title").textContent;
                    let imgUrl = game.querySelector(".picture").attributes[1].textContent;
                    let price = [{now:`${game.querySelector(".price .final").textContent}`},{old:`${game.querySelector(".retail").textContent}`}];
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
    getInstantGamingTopIndieGames: (req, res) => {
        (async () => {
            let options = {}

            if(process.env.AWS_LAMBDA_FUNCTION_VERSION){
                options = {
                    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
                    defaultViewport: chrome.defaultViewport,
                    executablePath: await chrome.executablePath,
                    headless: true,
                    ignoreHTTPSErrors: true,
                }
            }

            try {
                // Abrimos una instancia del puppeteer y accedemos a la url 
                const browser = await puppeteer.launch(options);
                const page = await browser.newPage();
                const response = await page.goto(
                    `https://www.instant-gaming.com/es/`
                );
                const body = await response.text();

                // Creamos una instancia del resultado devuelto por puppeter para parsearlo con jsdom
                const {
                    window: { document },
                } = new jsdom.JSDOM(body);

                let games = document.querySelectorAll('.indies-container .item')
                let results = []

                games.forEach((game, index) => {
                    if(index > 4){return} //Limitando a 5 resultados

                    let name = game.querySelector(".title").textContent;
                    let imgUrl = game.querySelector(".picture").attributes[1].textContent;
                    let price = [{now:`${game.querySelector(".price").textContent}`}];
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
