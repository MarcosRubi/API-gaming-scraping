const { addExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// En Docker apuntamos a un Chromium del sistema (PUPPETEER_EXECUTABLE_PATH);
// en desarrollo local usamos el Chromium embebido de "puppeteer".
const basePuppeteer = process.env.PUPPETEER_EXECUTABLE_PATH
    ? require("puppeteer-core")
    : require("puppeteer");

const puppeteer = addExtra(basePuppeteer);
puppeteer.use(StealthPlugin());

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const LAUNCH_OPTIONS = {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--hide-scrollbars",
    ],
};

let browserInstance = null;
let launching = null;

async function launchBrowser() {
    const browser = await puppeteer.launch(LAUNCH_OPTIONS);
    browser.on("disconnected", () => {
        console.warn("[browser] Chrome se desconectó, se relanzará en el próximo request");
        if (browserInstance === browser) browserInstance = null;
    });
    return browser;
}

async function getBrowser() {
    if (browserInstance) return browserInstance;
    if (!launching) {
        launching = launchBrowser().finally(() => {
            launching = null;
        });
    }
    browserInstance = await launching;
    return browserInstance;
}

async function initBrowser() {
    return getBrowser();
}

// La búsqueda del frontend dispara 5 scrapes en paralelo; sin límite, las 5
// pestañas compiten por CPU/red y las páginas pesadas (GOG) a veces no llegan
// a renderizar antes del timeout, dando "no encontrado" intermitente.
const MAX_CONCURRENT_PAGES = 3;
let activePages = 0;
const pageQueue = [];

async function acquirePageSlot() {
    while (activePages >= MAX_CONCURRENT_PAGES) {
        await new Promise((resolve) => pageQueue.push(resolve));
    }
    activePages++;
}

function releasePageSlot() {
    activePages--;
    const next = pageQueue.shift();
    if (next) next();
}

// Abre una página nueva, la prepara y garantiza su cierre pase lo que pase.
async function withPage(fn) {
    await acquirePageSlot();
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        try {
            await page.setUserAgent(USER_AGENT);
            await page.setViewport({ width: 1366, height: 768 });
            return await fn(page);
        } finally {
            await page.close().catch(() => {});
        }
    } finally {
        releasePageSlot();
    }
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close().catch(() => {});
        browserInstance = null;
    }
}

module.exports = { initBrowser, getBrowser, withPage, closeBrowser };
