import type { Page } from 'puppeteer-core';
import type { FieldConfig, RawExtraction, SelectorConfig } from '../../../common/types/game.types';
import { collectListItems } from '../engine/collect';

export interface SelectorPatch {
    container?: string;
    waitForSelector?: string;
    fields?: Record<string, FieldConfig | null>;
}

export interface ValidationResult {
    ok: boolean;
    reasons: string[];
    count: number;
}

// Combina el patch propuesto con la config actual. url, kind, limit,
// expectedMin, fallbackPriceText y containerScope SIEMPRE vienen de la
// config existente -- el patch nunca puede reubicar un sitio ni inventar
// formato de precio, solo ajustar selectores.
export function mergeConfig(config: SelectorConfig, patch: SelectorPatch | null): SelectorConfig | null {
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

function isAbsoluteUrl(value: unknown): boolean {
    return typeof value === 'string' && /^https?:\/\//.test(value);
}

// Re-corre la extracción con la config candidata sobre el DOM ya cargado y
// exige un mínimo de resultados con nombre, URL absoluta y precio plausible.
export async function validateConfig(page: Page, candidate: SelectorConfig | null): Promise<ValidationResult> {
    if (!candidate || !candidate.container) {
        return { ok: false, reasons: ['falta container en el patch'], count: 0 };
    }

    let raw: RawExtraction;
    try {
        raw = await page.evaluate(collectListItems, candidate);
    } catch (err) {
        return { ok: false, reasons: [`la config candidata tiró error: ${(err as Error).message}`], count: 0 };
    }

    const minExpected = candidate.expectedMin || (candidate.kind === 'search' ? 1 : 3);
    if (raw.items.length < minExpected) {
        return {
            ok: false,
            reasons: [`solo ${raw.items.length} resultados, se esperaban >= ${minExpected}`],
            count: raw.items.length,
        };
    }

    const reasons: string[] = [];
    raw.items.forEach((item, i) => {
        if (!item.name) reasons.push(`item ${i}: falta name`);
        if (!isAbsoluteUrl(item.url)) reasons.push(`item ${i}: url no absoluta ("${item.url}")`);
        const priceLooksValid = (item.price && /\d/.test(item.price)) || (!item.price && candidate.fallbackPriceText);
        if (!priceLooksValid) reasons.push(`item ${i}: precio con forma inválida`);
    });

    if (reasons.length > 0) return { ok: false, reasons, count: raw.items.length };
    return { ok: true, reasons: [], count: raw.items.length };
}
