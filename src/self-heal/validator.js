const { collectListItems } = require("../scrapers/collect");

// Combina el patch propuesto con la config actual. url, kind, limit,
// expectedMin, priceTemplate, fallbackPriceText y containerScope SIEMPRE
// vienen de la config existente -- el patch nunca puede reubicar un sitio ni
// inventar formato de precio, solo ajustar selectores.
function mergeConfig(config, patch) {
    if (!patch) return null;
    const fields = { ...config.fields };
    if (patch.fields) {
        Object.entries(patch.fields).forEach(([key, value]) => {
            if (value && value.attr) fields[key] = { ...fields[key], ...value };
        });
    }
    return {
        ...config,
        container: patch.container || config.container,
        waitForSelector: patch.waitForSelector || config.waitForSelector,
        fields,
    };
}

function isAbsoluteUrl(value) {
    return typeof value === "string" && /^https?:\/\//.test(value);
}

async function validate(page, candidateConfig) {
    if (!candidateConfig || !candidateConfig.container) {
        return { ok: false, reasons: ["falta container en el patch"], count: 0 };
    }

    let raw;
    try {
        raw = await page.evaluate(collectListItems, candidateConfig);
    } catch (err) {
        return { ok: false, reasons: [`la config candidata tiró error: ${err.message}`], count: 0 };
    }

    const minExpected = candidateConfig.expectedMin || (candidateConfig.kind === "search" ? 1 : 3);
    if (raw.items.length < minExpected) {
        return { ok: false, reasons: [`solo ${raw.items.length} resultados, se esperaban >= ${minExpected}`], count: raw.items.length };
    }

    const reasons = [];
    raw.items.forEach((item, i) => {
        if (!item.name) reasons.push(`item ${i}: falta name`);
        if (!isAbsoluteUrl(item.url)) reasons.push(`item ${i}: url no absoluta ("${item.url}")`);
        const priceLooksValid = (item.price && /\d/.test(item.price)) || (!item.price && candidateConfig.fallbackPriceText);
        if (!priceLooksValid) reasons.push(`item ${i}: precio con forma inválida`);
    });

    if (reasons.length > 0) return { ok: false, reasons, count: raw.items.length };
    return { ok: true, reasons: [], count: raw.items.length };
}

module.exports = { validate, mergeConfig };
