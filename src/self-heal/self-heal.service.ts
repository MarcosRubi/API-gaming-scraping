import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Page } from 'puppeteer-core';
import type { SelectorConfig, Site } from '../common/types';
import { SelectorStoreService } from '../selectors/selector-store.service';
import { OpenAiSelectorClient } from './openai-selector.client';
import { mergeConfig, validateConfig } from './selector-validator';

const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000;

export interface HealRequest {
    site: Site;
    key: string;
    page: Page;
    config: SelectorConfig;
    reason: 'error' | 'suspicious-empty';
    error: Error | null;
}

// Corre dentro del navegador: si el container todavía matchea algo, manda
// solo esos items (barato y apuntado); si no, manda el body completo sin
// scripts/estilos, truncado.
function sampleHtml(page: Page, config: SelectorConfig): Promise<string> {
    return page.evaluate((cfg: SelectorConfig) => {
        const items = Array.from(document.querySelectorAll(cfg.container)).slice(0, 3);
        if (items.length > 0) {
            return items.map((el) => el.outerHTML).join('\n');
        }
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style').forEach((el) => el.remove());
        return clone.innerHTML.slice(0, 60000);
    }, config);
}

@Injectable()
export class SelfHealService {
    private readonly logger = new Logger(SelfHealService.name);
    private readonly lastAttempt = new Map<string, number>();
    private warnedDisabled = false;

    constructor(
        private readonly config: ConfigService,
        private readonly openai: OpenAiSelectorClient,
        private readonly selectorStore: SelectorStoreService,
    ) {}

    private get cooldownMs(): number {
        return Number(this.config.get('SELF_HEAL_COOLDOWN_MS')) || DEFAULT_COOLDOWN_MS;
    }

    // Se llama con la página todavía abierta (la validación necesita re-correr
    // la extracción contra el mismo DOM ya renderizado, sin re-navegar). Si
    // devuelve una config, el motor reintenta la extracción con ella; si
    // devuelve null, el motor deja subir el error/resultado tal cual tenía --
    // nunca peor que sin self-heal.
    async maybeHeal({ site, key, page, config, reason, error }: HealRequest): Promise<SelectorConfig | null> {
        if (!this.openai.enabled) {
            if (!this.warnedDisabled) {
                this.logger.warn('OPENAI_API_KEY no configurada, auto-reparación deshabilitada');
                this.warnedDisabled = true;
            }
            return null;
        }

        const cooldownId = `${site}:${key}`;
        const last = this.lastAttempt.get(cooldownId);
        if (last && Date.now() - last < this.cooldownMs) {
            this.logger.warn(`${cooldownId}: en cooldown, no se llama a la IA`);
            return null;
        }
        this.lastAttempt.set(cooldownId, Date.now());

        const errorMessage = error?.message;
        try {
            const html = await sampleHtml(page, config);
            const patch = await this.openai.inferSelectorPatch({ site, key, url: page.url(), html, currentConfig: config });
            const candidate = mergeConfig(config, patch);
            const result = await validateConfig(page, candidate);

            if (!result.ok || !candidate) {
                this.logger.error(`${cooldownId}: patch inválido ${JSON.stringify(result.reasons)}`);
                await this.selectorStore.logHealAttempt(site, key, { reason, error: errorMessage, patch, validation: result });
                return null;
            }

            this.logger.log(`${cooldownId}: patch aplicado (${result.count} resultados)`);
            await this.selectorStore.setOverride(site, key, candidate, { reason, error: errorMessage, validation: result });
            return candidate;
        } catch (err) {
            this.logger.error(`${cooldownId}: fallo en el intento de reparación`, err as Error);
            await this.selectorStore.logHealAttempt(site, key, {
                reason,
                error: errorMessage,
                healError: (err as Error).message,
            });
            return null;
        }
    }
}
