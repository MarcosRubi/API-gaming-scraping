import { Injectable } from '@nestjs/common';
import { BrowserService } from '../../infrastructure/browser/browser.service';
import { fetchJson, fetchText } from '../../common/http/http.utils';
import type { Game, Site } from '../../common/types/game.types';

// Screenshots para las listas del banner destacado. GOG e Instant Gaming
// embeben las URLs de su galería en el HTML del producto (fetch estático);
// Humble tiene API JSON pero Cloudflare bloquea el fetch de Node, así que
// se lee navegándola con el browser stealth; Fanatical no tiene API por
// producto ni SSR, así que se abre la página del juego y se toma la galería.
// Steam usa su API appdetails. Cada juego falla aislado (se queda sin
// screenshots) sin romper la lista.

const MAX_SCREENSHOTS = 4;
const FETCH_TIMEOUT_MS = 8000;
const STEAM_TIMEOUT_MS = 5000;

type Extractor = (game: Game) => Promise<string[]>;

// Último segmento de path después de `marker`, sin query/hash. Sirve tanto
// para URLs absolutas como relativas.
function slugAfter(url: string | null, marker: string): string | null {
    const idx = String(url || '').indexOf(marker);
    if (idx === -1) return null;
    const slug = String(url).slice(idx + marker.length).split(/[/?#]/)[0];
    return slug || null;
}

@Injectable()
export class ScreenshotsService {
    private readonly extractors: Partial<Record<Site, Extractor>>;

    constructor(private readonly browser: BrowserService) {
        this.extractors = {
            gog: (game) => this.fromGog(game),
            'instant-gaming': (game) => this.fromInstantGaming(game),
            humble: (game) => this.fromHumble(game),
            fanatical: (game) => this.fromFanatical(game),
        };
    }

    // Añade `screenshots` (máx. 4) a cada juego de la lista que no las tenga.
    async enrich(games: Game[], site: Site): Promise<Game[]> {
        const extract = this.extractors[site];
        if (!extract || !Array.isArray(games)) return games;
        return Promise.all(
            games.map(async (game) => {
                if (Array.isArray(game.screenshots) && game.screenshots.length > 0) return game;
                try {
                    const shots = await extract(game);
                    return shots.length > 0 ? { ...game, screenshots: shots.slice(0, MAX_SCREENSHOTS) } : game;
                } catch {
                    return game;
                }
            }),
        );
    }

    // Steam: la API appdetails trae screenshots y una portada de mejor
    // calidad (header_image) que la cápsula del listado.
    async enrichSteam(games: Game[]): Promise<Game[]> {
        return Promise.all(
            games.map(async (game) => {
                if (!game.appId) return game;
                const json = await fetchJson(
                    `https://store.steampowered.com/api/appdetails?appids=${game.appId}&l=spanish`,
                    STEAM_TIMEOUT_MS,
                );
                const data = json?.[game.appId]?.data;
                if (!data) return game;
                return {
                    ...game,
                    screenshots: (data.screenshots || []).slice(0, MAX_SCREENSHOTS).map((s: any) => s.path_full),
                    imgUrl: data.header_image || game.imgUrl,
                };
            }),
        );
    }

    // El HTML del producto embebe "screenshots":[{"imageUrl":...}] (JSON del
    // productcard). El hash base se sirve con sufijo de variante de tamaño.
    private async fromGog(game: Game): Promise<string[]> {
        if (!game.url) return [];
        const html = await fetchText(game.url, FETCH_TIMEOUT_MS);
        const match = html?.match(/"screenshots":\[(.*?)\]/);
        if (!match) return [];
        return [...match[1].matchAll(/"imageUrl":"([^"]+)"/g)].map(
            (m) => `${m[1].replace(/\\\//g, '/')}_product_card_v2_mobile_slider_639.jpg`,
        );
    }

    // El HTML del producto lista la galería en gaming-cdn.com; se toman las
    // variantes base "-wallpaper-N.jpg" (sin sufijo -small/-medium/etc.).
    private async fromInstantGaming(game: Game): Promise<string[]> {
        if (!game.url) return [];
        const html = await fetchText(game.url, FETCH_TIMEOUT_MS);
        if (!html) return [];
        const found = html.match(/https:\/\/gaming-cdn\.com\/images\/products\/\d+\/screenshot\/[^"'\s)]+/g) || [];
        const full = found.filter((u) => /-wallpaper-\d+\.jpg(\?v=\d+)?$/.test(u));
        return [...new Set(full)];
    }

    // API de la Humble Store (carousel_content.screenshot trae URLs
    // completas de imgix). Cloudflare devuelve 403 al fetch de Node, así
    // que se navega con el browser stealth y se lee el JSON del body.
    private async fromHumble(game: Game): Promise<string[]> {
        const slug = slugAfter(game.url, '/store/');
        if (!slug) return [];
        return this.browser.withPage(async (page) => {
            await page.goto(
                `https://www.humblebundle.com/store/api/lookup?products%5B%5D=${encodeURIComponent(slug)}&request=1`,
                { waitUntil: 'domcontentloaded', timeout: 20000 },
            );
            const body = await page.evaluate(() => document.body.innerText);
            return JSON.parse(body)?.result?.[0]?.carousel_content?.screenshot || [];
        });
    }

    // Fanatical renderiza todo en cliente: se abre la página del juego y se
    // toman las imágenes de la galería (product/original/{uuid}), quitando
    // la portada y pidiéndole a imgix un tamaño grande.
    private async fromFanatical(game: Game): Promise<string[]> {
        if (!game.url) return [];
        const url = game.url;
        const coverId = (String(game.imgUrl || '').match(/product\/original\/([^?]+)/) || [])[1];
        const rendered = await this.browser.withPage(async (page) => {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            return page.evaluate(() =>
                Array.from(document.querySelectorAll('img'))
                    .map((img) => img.currentSrc || img.src || '')
                    .filter((src) => src.includes('/product/original/')),
            );
        });
        const seen = new Set<string>();
        const shots: string[] = [];
        for (const src of rendered) {
            const file = (src.match(/product\/original\/([^?]+)/) || [])[1];
            if (!file || file === coverId || seen.has(file)) continue;
            seen.add(file);
            shots.push(`https://fanatical.imgix.net/product/original/${file}?auto=compress,format&w=850&fit=crop`);
        }
        return shots;
    }
}
