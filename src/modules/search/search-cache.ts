// Caché de búsquedas en memoria. Evita volver a scrapear una tienda por el
// mismo juego (Steam bloquea la IP por volumen):
// - la duración la decide `ttlMs` según el resultado (0 = no cachear);
// - los errores no se cachean: la próxima búsqueda reintenta;
// - búsquedas iguales en paralelo comparten una sola petición;
// - con más de `maxEntries` se descarta la más vieja.
// Sin dependencias ni parameter properties: el test lo corre `node --test`
// directo sobre el .ts.
export interface SearchCacheOptions<T> {
    ttlMs: (value: T) => number;
    maxEntries?: number;
    now?: () => number;
}

export class SearchCache<T> {
    private readonly entries = new Map<string, { value: T; expires: number }>();
    private readonly inFlight = new Map<string, Promise<T>>();
    private readonly ttlMs: (value: T) => number;
    private readonly maxEntries: number;
    private readonly now: () => number;

    constructor(options: SearchCacheOptions<T>) {
        this.ttlMs = options.ttlMs;
        this.maxEntries = options.maxEntries ?? 500;
        this.now = options.now ?? Date.now;
    }

    get(key: string, load: () => Promise<T>): Promise<T> {
        const entry = this.entries.get(key);
        if (entry && entry.expires > this.now()) return Promise.resolve(entry.value);
        if (entry) this.entries.delete(key);

        const pending = this.inFlight.get(key);
        if (pending) return pending;

        const request = load()
            .then((value) => {
                this.store(key, value);
                return value;
            })
            .finally(() => this.inFlight.delete(key));
        this.inFlight.set(key, request);
        return request;
    }

    private store(key: string, value: T): void {
        const ttl = this.ttlMs(value);
        if (ttl <= 0) return;
        this.entries.delete(key);
        this.entries.set(key, { value, expires: this.now() + ttl });
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value as string;
            this.entries.delete(oldest);
        }
    }
}

// "Hollow  Knight " y "hollow knight" son la misma búsqueda.
export function normalizeTerm(term: string): string {
    return term.trim().toLowerCase().replace(/\s+/g, ' ');
}
