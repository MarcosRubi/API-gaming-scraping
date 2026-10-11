// Limita cuántas promesas corren a la vez (las APIs de Steam cortan con
// 429 si se les pegan decenas de requests en paralelo).
export class ConcurrencyLimiter {
    private active = 0;
    private readonly queue: Array<() => void> = [];

    constructor(private readonly max: number) {}

    async run<T>(task: () => Promise<T>): Promise<T> {
        while (this.active >= this.max) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
        }
        this.active++;
        try {
            return await task();
        } finally {
            this.active--;
            this.queue.shift()?.();
        }
    }
}

// Caché en memoria con vencimiento por entrada.
export class TtlCache<T> {
    private readonly entries = new Map<string, { value: T; expires: number }>();

    constructor(private readonly ttlMs: number) {}

    get(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expires) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key: string, value: T, ttlMs = this.ttlMs): void {
        this.entries.set(key, { value, expires: Date.now() + ttlMs });
    }

    // Para persistir en disco y recuperar tras un reinicio.
    toJSON(): Record<string, { value: T; expires: number }> {
        const now = Date.now();
        return Object.fromEntries([...this.entries].filter(([, entry]) => entry.expires > now));
    }

    load(saved: Record<string, { value: T; expires: number }> | undefined): void {
        const now = Date.now();
        for (const [key, entry] of Object.entries(saved ?? {})) {
            if (entry.expires > now) this.entries.set(key, entry);
        }
    }
}
