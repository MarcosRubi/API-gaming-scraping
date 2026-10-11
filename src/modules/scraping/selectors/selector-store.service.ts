import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { SelectorConfig, Site } from '../../../common/types/game.types';
import { appendJsonLine, readJsonFile, writeJsonFile } from '../../../common/storage/json-file';
import { dataPath } from '../../../common/storage/paths';
import steam from './steam.json';
import gog from './gog.json';
import instantGaming from './instant-gaming.json';
import humble from './humble.json';
import fanatical from './fanatical.json';

type SiteConfigs = Record<string, SelectorConfig>;

const OVERRIDES_PATH = dataPath('selectors-overrides.json');
const HEAL_LOG_PATH = dataPath('selector-heal-log.jsonl');

// Selectores versionados en el repo (src/selectors/*.json).
const BASE: Record<Site, SiteConfigs> = {
    steam: steam as unknown as SiteConfigs,
    gog: gog as unknown as SiteConfigs,
    'instant-gaming': instantGaming as unknown as SiteConfigs,
    humble: humble as unknown as SiteConfigs,
    fanatical: fanatical as unknown as SiteConfigs,
};

// Config de selectores por sitio/clave. Los overrides (escritos por el
// self-heal en data/) tienen prioridad sobre los del repo.
@Injectable()
export class SelectorStoreService implements OnModuleInit {
    private readonly logger = new Logger(SelectorStoreService.name);
    private overrides: Partial<Record<Site, SiteConfigs>> = {};

    async onModuleInit() {
        try {
            const saved = await readJsonFile<Partial<Record<Site, SiteConfigs>>>(OVERRIDES_PATH);
            if (saved) {
                this.overrides = saved;
                this.logger.log(`overrides cargados (${Object.keys(saved).length} sitios)`);
            }
        } catch (err) {
            this.logger.error('no se pudo leer overrides de disco', err as Error);
        }
    }

    getConfig(site: Site, key: string): SelectorConfig | undefined {
        return this.overrides[site]?.[key] ?? BASE[site]?.[key];
    }

    async setOverride(site: Site, key: string, config: SelectorConfig, meta: Record<string, unknown> = {}) {
        this.overrides[site] = { ...this.overrides[site], [key]: config };
        await writeJsonFile(OVERRIDES_PATH, this.overrides);
        await this.appendHealLog({ site, key, applied: true, config, ...meta });
    }

    async logHealAttempt(site: Site, key: string, meta: Record<string, unknown> = {}) {
        await this.appendHealLog({ site, key, applied: false, ...meta });
    }

    private appendHealLog(entry: Record<string, unknown>) {
        return appendJsonLine(HEAL_LOG_PATH, { ...entry, at: new Date().toISOString() });
    }
}
