const cron = require("node-cron");
const registry = require("../scrapers");
const store = require("./store");
const { enrichCategories } = require("../categories/enrich");

// La clave de caché termina con el nombre del sitio ("top-sellers-gog").
const SITES = ["instant-gaming", "steam", "gog", "humble", "fanatical"];
function siteOfKey(key) {
    return SITES.find((site) => key.endsWith(site)) || null;
}

// Recorre los scrapers cacheables de forma secuencial (no en paralelo) para
// no golpear los sitios origen a la vez. Un fallo puntual no bloquea al resto.
// Después de cada scrape se enriquecen las categorías (cache por URL: solo
// los juegos nuevos cuestan visitas/llamadas).
async function runAll() {
    for (const { key, fn } of registry) {
        try {
            const data = await fn();
            await enrichCategories(data, siteOfKey(key));
            await store.set(key, data);
            console.log(`[scheduler] actualizado ${key}`);
        } catch (err) {
            console.error(`[scheduler] fallo actualizando ${key}`, err);
            store.setError(key, err.message);
        }
    }
}

async function refreshOne(key) {
    const entry = registry.find((item) => item.key === key);
    if (!entry) throw new Error(`Clave de caché desconocida: ${key}`);
    const data = await entry.fn();
    await enrichCategories(data, siteOfKey(key));
    await store.set(key, data);
    return data;
}

function start() {
    const schedule = process.env.CACHE_REFRESH_CRON || "0 * * * *";
    cron.schedule(schedule, () => {
        runAll().catch((err) => console.error("[scheduler] runAll falló", err));
    });
    console.log(`[scheduler] cron programado: ${schedule}`);
}

module.exports = { start, runAll, refreshOne };
