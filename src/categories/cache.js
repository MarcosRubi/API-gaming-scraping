// Caché persistente de categorías por URL de producto: las categorías de un
// juego no cambian, así que cada URL se resuelve UNA vez (API o página de
// producto) y después sale de acá. Sin DB: JSON en data/, como el snapshot.
const fs = require("fs/promises");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "..", "..", "data", "categories-cache.json");

// TTLs: un acierto vive 30 días (por si la tienda re-categoriza); un fallo
// (lista vacía) se reintenta a los 3 días para no martillar en cada cron.
const TTL_HIT_MS = 30 * 24 * 60 * 60 * 1000;
const TTL_MISS_MS = 3 * 24 * 60 * 60 * 1000;

const cache = new Map();
let loaded = false;
let dirty = false;

async function load() {
    if (loaded) return;
    loaded = true;
    try {
        const raw = await fs.readFile(CACHE_PATH, "utf-8");
        Object.entries(JSON.parse(raw)).forEach(([url, entry]) => cache.set(url, entry));
        console.log(`[categories] cache cargada (${cache.size} urls)`);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("[categories] no se pudo leer la cache", err);
        }
    }
}

function get(url) {
    const entry = cache.get(url);
    if (!entry) return null;
    const ttl = entry.categories.length > 0 ? TTL_HIT_MS : TTL_MISS_MS;
    if (Date.now() - entry.ts > ttl) return null;
    return entry.categories;
}

function set(url, categories) {
    cache.set(url, { categories, ts: Date.now() });
    dirty = true;
}

async function persist() {
    if (!dirty) return;
    dirty = false;
    try {
        const tmpPath = `${CACHE_PATH}.tmp`;
        await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
        await fs.writeFile(tmpPath, JSON.stringify(Object.fromEntries(cache)), "utf-8");
        await fs.rename(tmpPath, CACHE_PATH);
    } catch (err) {
        console.error("[categories] no se pudo persistir la cache", err);
    }
}

module.exports = { load, get, set, persist };
