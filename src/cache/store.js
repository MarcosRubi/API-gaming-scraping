const fs = require("fs/promises");
const path = require("path");

const SNAPSHOT_PATH = path.join(__dirname, "..", "..", "data", "cache-snapshot.json");

const store = new Map();

async function loadFromDisk() {
    try {
        const raw = await fs.readFile(SNAPSHOT_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([key, value]) => store.set(key, value));
        console.log(`[cache] snapshot cargado (${store.size} claves)`);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("[cache] no se pudo leer el snapshot de disco", err);
        }
    }
}

async function saveToDisk() {
    const obj = Object.fromEntries(store);
    const tmpPath = `${SNAPSHOT_PATH}.tmp`;
    await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(obj), "utf-8");
    await fs.rename(tmpPath, SNAPSHOT_PATH);
}

function get(key) {
    return store.get(key);
}

function set(key, data) {
    store.set(key, { data, updatedAt: Date.now(), lastError: null });
    return saveToDisk().catch((err) => console.error("[cache] no se pudo persistir el snapshot", err));
}

function setError(key, message) {
    const existing = store.get(key);
    store.set(key, {
        data: existing ? existing.data : null,
        updatedAt: existing ? existing.updatedAt : null,
        lastError: message,
    });
}

module.exports = { loadFromDisk, get, set, setError };
