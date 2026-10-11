import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readJsonFile, writeJsonFile } from '../../common/storage/json-file';
import { dataPath } from '../../common/storage/paths';
import type { Game } from '../../common/types/game.types';
import { parseSteamAppId, similarNames, stripEdition } from '../../common/utils/game-names';
import { SteamApiClient } from './steam-api.client';

const MATCH_CACHE_PATH = dataPath('steam-match-cache.json');
const TTL_HIT_MS = 30 * 24 * 60 * 60 * 1000;
const TTL_MISS_MS = 3 * 24 * 60 * 60 * 1000;
const MIN_REVIEWS = 10;

interface MatchEntry {
    appId: string | null;
    ts: number;
}

// Agrega a cada juego su app de Steam equivalente (`steamAppId`) y la
// valoración 0-5 según sus reseñas. La equivalencia de un juego de GOG,
// Humble, etc. se busca por nombre UNA vez y queda en data/ (no cambia).
@Injectable()
export class SteamEnrichService implements OnModuleInit {
    private readonly logger = new Logger(SteamEnrichService.name);
    private readonly matches = new Map<string, MatchEntry>();
    private dirty = false;

    constructor(private readonly steam: SteamApiClient) {}

    async onModuleInit() {
        try {
            const saved = await readJsonFile<Record<string, MatchEntry>>(MATCH_CACHE_PATH);
            if (saved) Object.entries(saved).forEach(([url, entry]) => this.matches.set(url, entry));
        } catch (err) {
            this.logger.error('no se pudo leer la caché de equivalencias', err as Error);
        }
    }

    // Muta los juegos. Acepta cualquier resultado: si no es un array, lo
    // devuelve intacto.
    async enrich<T>(items: T): Promise<T> {
        if (!Array.isArray(items)) return items;
        const games = items as Game[];
        for (const game of games) {
            try {
                game.steamAppId ??= (await this.matchAppId(game)) ?? undefined;
                if (game.steamAppId) Object.assign(game, await this.rating(game.steamAppId));
            } catch {
                // un juego sin equivalencia o sin reseñas no rompe la lista
            }
        }
        // Portadas reales de todos los juegos de la lista en una sola llamada.
        const ids = games.map((g) => g.steamAppId).filter((id): id is string => !!id);
        const art = await this.steam.storeAssets(ids).catch(() => new Map());
        for (const game of games) {
            const found = game.steamAppId ? art.get(game.steamAppId) : null;
            if (found) game.art = found;
        }
        await this.persist();
        return items;
    }

    private async matchAppId(game: Game): Promise<string | null> {
        const direct = parseSteamAppId(game.url);
        if (direct) return direct;
        if (!game.url || !game.name) return null;

        const cached = this.matches.get(game.url);
        if (cached && Date.now() - cached.ts < (cached.appId ? TTL_HIT_MS : TTL_MISS_MS)) return cached.appId;

        const term = stripEdition(game.name);
        const [first] = term ? await this.steam.storeSearch(term) : [];
        const appId = first && similarNames(first.name, term) ? String(first.id) : null;
        this.matches.set(game.url, { appId, ts: Date.now() });
        this.dirty = true;
        return appId;
    }

    private async rating(appId: string): Promise<Pick<Game, 'rating' | 'ratingCount'>> {
        const summary = await this.steam.reviewSummary(appId);
        if (!summary || summary.total_reviews < MIN_REVIEWS) return {};
        return {
            rating: Math.round((summary.total_positive / summary.total_reviews) * 50) / 10,
            ratingCount: summary.total_reviews,
        };
    }

    private async persist() {
        if (!this.dirty) return;
        this.dirty = false;
        await writeJsonFile(MATCH_CACHE_PATH, Object.fromEntries(this.matches)).catch((err) =>
            this.logger.error('no se pudo guardar la caché de equivalencias', err),
        );
    }
}
