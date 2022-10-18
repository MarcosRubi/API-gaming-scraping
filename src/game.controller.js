const puppeteer = require("puppeteer");
const jsdom = require("jsdom");

const Game = {
    list: (req,res)=>{
        res.status(200).json({data:'Listando Juegos Populares'})
    },
    get: (req,res)=>{
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
                let notFound = document.querySelector('#search_resultsRows a')
                if(notFound === null){
                    res.status(200).json({steam:'null'})
                    return
                }
                let name = document.querySelector('#search_resultsRows a .title').textContent
                let imgUrl = document.querySelector('#search_resultsRows a img').src
                let price = document.querySelector('#search_resultsRows a .search_price').textContent.split('$').splice(1)
                let discount = document.querySelector('#search_resultsRows a .search_discount').textContent.trim()
                const data = {
                    name,
                    imgUrl,
                    price,
                    discount
                }

                res.status(200).json(data)
    
                // Cerramos el puppeteer
                await browser.close();
            } catch (error) {
                console.error(error);
            }
        })()
    }
}

module.exports = Game