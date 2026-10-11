import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readJsonFile, writeJsonFile } from '../common/json-file';
import { dataPath } from '../common/paths';

// Caché persistente de categorías por URL de producto: las categorías de un
// juego no cambian, así que cada URL se resuelve UNA vez (API o página de
// producto) y después sale de acá. Sin DB: JSON en data/, como el snapshot.
const CACHE_PATH = dataPath('categories-cache.json');

// TTLs: un acierto vive 30 días (por si la tienda re-categoriza); un fallo
// (lista vacía) se reintenta a los 3 días para no martillar en cada cron.
const TTL_HIT_MS = 30 * 24 * 60 * 60 * 1000;
const TTL_MISS_MS = 3 * 24 * 60 * 60 * 1000;

interface CacheEntry {
    categories: string[];
    ts: number;
}

@Injectable()
export class CategoriesCacheService implements OnModuleInit {
    private readonly logger = new Logger(CategoriesCacheService.name);
    private readonly cache = new Map<string, CacheEntry>();
    private dirty = false;

    async onModuleInit() {
        try {
            const saved = await readJsonFile<Record<string, CacheEntry>>(CACHE_PATH);
            if (saved) {
                Object.entries(saved).forEach(([url, entry]) => this.cache.set(url, entry));
                this.logger.log(`cache cargada (${this.cache.size} urls)`);
            }
        } catch (err) {
            this.logger.error('no se pudo leer la cache', err as Error);
        }
    }

    get(url: string | null): string[] | null {
        if (!url) return null;
        const entry = this.cache.get(url);
        if (!entry) return null;
        const ttl = entry.categories.length > 0 ? TTL_HIT_MS : TTL_MISS_MS;
        if (Date.now() - entry.ts > ttl) return null;
        return entry.categories;
    }

    set(url: string | null, categories: string[]) {
        if (!url) return;
        this.cache.set(url, { categories, ts: Date.now() });
        this.dirty = true;
    }

    async persist() {
        if (!this.dirty) return;
        this.dirty = false;
        try {
            await writeJsonFile(CACHE_PATH, Object.fromEntries(this.cache));
        } catch (err) {
            this.logger.error('no se pudo persistir la cache', err as Error);
        }
    }
}
