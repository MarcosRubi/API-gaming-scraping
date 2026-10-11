const fs = require("fs/promises");
const path = require("path");

const OVERRIDES_PATH = path.join(__dirname, "..", "..", "data", "selectors-overrides.json");
const HEAL_LOG_PATH = path.join(__dirname, "..", "..", "data", "selector-heal-log.jsonl");

const base = {
    steam: require("./selectors/steam.json"),
    gog: require("./selectors/gog.json"),
    "instant-gaming": require("./selectors/instant-gaming.json"),
    humble: require("./selectors/humble.json"),
    fanatical: require("./selectors/fanatical.json"),
};

let overrides = {};

async function loadFromDisk() {
    try {
        const raw = await fs.readFile(OVERRIDES_PATH, "utf-8");
        overrides = JSON.parse(raw);
        console.log(`[selectors] overrides cargados (${Object.keys(overrides).length} sitios)`);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("[selectors] no se pudo leer overrides de disco", err);
        }
    }
}

function getConfig(site, key) {
    return (overrides[site] && overrides[site][key]) || (base[site] && base[site][key]);
}

async function saveOverridesToDisk() {
    const tmpPath = `${OVERRIDES_PATH}.tmp`;
    await fs.mkdir(path.dirname(OVERRIDES_PATH), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(overrides), "utf-8");
    await fs.rename(tmpPath, OVERRIDES_PATH);
}

async function appendHealLog(entry) {
    await fs.mkdir(path.dirname(HEAL_LOG_PATH), { recursive: true });
    await fs.appendFile(HEAL_LOG_PATH, `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`, "utf-8");
}

async function setOverride(site, key, config, meta = {}) {
    overrides[site] = overrides[site] || {};
    overrides[site][key] = config;
    await saveOverridesToDisk();
    await appendHealLog({ site, key, applied: true, config, ...meta });
}

async function logHealAttempt(site, key, meta = {}) {
    await appendHealLog({ site, key, applied: false, ...meta });
}

module.exports = { loadFromDisk, getConfig, setOverride, logHealAttempt };
