const cooldown = require("./cooldown");
const { sampleHtml } = require("./sample-html");
const { inferSelectorPatch } = require("./openai-client");
const { validate, mergeConfig } = require("./validator");
const selectorStore = require("../config/selector-store");

const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000;

let warnedDisabled = false;

// Se llama con la página todavía abierta (la validación necesita re-correr
// la extracción contra el mismo DOM ya renderizado, sin re-navegar). Si
// devuelve una config, el motor reintenta la extracción con ella; si
// devuelve null, el motor deja subir el error/resultado tal cual tenía --
// nunca peor que el comportamiento de hoy.
async function maybeHeal({ site, key, page, config, reason, error }) {
    if (!process.env.OPENAI_API_KEY) {
        if (!warnedDisabled) {
            console.warn("[self-heal] OPENAI_API_KEY no configurada, auto-reparación deshabilitada");
            warnedDisabled = true;
        }
        return null;
    }

    const cooldownId = `${site}:${key}`;
    const cooldownMs = Number(process.env.SELF_HEAL_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS;
    if (!cooldown.canAttempt(cooldownId, cooldownMs)) {
        console.warn(`[self-heal] ${cooldownId}: en cooldown, no se llama a la IA`);
        return null;
    }
    cooldown.recordAttempt(cooldownId);

    try {
        const html = await sampleHtml(page, config);
        const patch = await inferSelectorPatch({ site, key, url: page.url(), html, currentConfig: config });
        const candidate = mergeConfig(config, patch);
        const result = await validate(page, candidate);

        if (!result.ok) {
            console.error(`[self-heal] ${cooldownId}: patch inválido`, result.reasons);
            await selectorStore.logHealAttempt(site, key, { reason, error: error && error.message, patch, validation: result });
            return null;
        }

        console.log(`[self-heal] ${cooldownId}: patch aplicado (${result.count} resultados)`);
        await selectorStore.setOverride(site, key, candidate, { reason, error: error && error.message, validation: result });
        return candidate;
    } catch (err) {
        console.error(`[self-heal] ${cooldownId}: fallo en el intento de reparación`, err);
        await selectorStore.logHealAttempt(site, key, { reason, error: error && error.message, healError: err.message });
        return null;
    }
}

module.exports = { maybeHeal };
