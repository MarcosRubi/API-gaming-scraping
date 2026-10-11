import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readJsonFile, writeJsonFile } from '../../common/storage/json-file';
import { dataPath } from '../../common/storage/paths';

const SNAPSHOT_PATH = dataPath('cache-snapshot.json');

export interface CacheEntry {
    data: unknown;
    updatedAt: number | null;
    lastError: string | null;
}

// Caché en memoria de los listados, con snapshot en disco para que un
// reinicio sirva datos al instante sin esperar al primer scrape.
@Injectable()
export class CacheStoreService implements OnModuleInit {
    private readonly logger = new Logger(CacheStoreService.name);
    private readonly store = new Map<string, CacheEntry>();

    async onModuleInit() {
        try {
            const saved = await readJsonFile<Record<string, CacheEntry>>(SNAPSHOT_PATH);
            if (saved) {
                Object.entries(saved).forEach(([key, value]) => this.store.set(key, value));
                this.logger.log(`snapshot cargado (${this.store.size} claves)`);
            }
        } catch (err) {
            this.logger.error('no se pudo leer el snapshot de disco', err as Error);
        }
    }

    get(key: string): CacheEntry | undefined {
        return this.store.get(key);
    }

    async set(key: string, data: unknown) {
        this.store.set(key, { data, updatedAt: Date.now(), lastError: null });
        await writeJsonFile(SNAPSHOT_PATH, Object.fromEntries(this.store)).catch((err) =>
            this.logger.error('no se pudo persistir el snapshot', err),
        );
    }

    // Un fallo conserva los últimos datos buenos: se sigue sirviendo lo viejo.
    setError(key: string, message: string) {
        const existing = this.store.get(key);
        this.store.set(key, {
            data: existing?.data ?? null,
            updatedAt: existing?.updatedAt ?? null,
            lastError: message,
        });
    }
}
