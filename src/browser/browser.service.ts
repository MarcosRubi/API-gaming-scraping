import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Browser, LaunchOptions, Page } from 'puppeteer-core';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { USER_AGENT } from '../common/http';

// En Docker apuntamos a un Chromium del sistema (PUPPETEER_EXECUTABLE_PATH);
// en desarrollo local usamos el Chromium embebido de "puppeteer" (devDependency).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const basePuppeteer = process.env.PUPPETEER_EXECUTABLE_PATH ? require('puppeteer-core') : require('puppeteer');
const puppeteer = addExtra(basePuppeteer);
puppeteer.use(StealthPlugin());

const LAUNCH_OPTIONS: LaunchOptions = {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--hide-scrollbars'],
};

// La búsqueda del frontend dispara 5 scrapes en paralelo; sin límite, las 5
// pestañas compiten por CPU/red y las páginas pesadas (GOG) a veces no llegan
// a renderizar antes del timeout, dando "no encontrado" intermitente.
const MAX_CONCURRENT_PAGES = 3;

// Un único Chrome persistente para toda la app: se lanza al iniciar el
// módulo y se relanza solo si se desconecta.
@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BrowserService.name);
    private browser: Browser | null = null;
    private launching: Promise<Browser> | null = null;
    private activePages = 0;
    private readonly pageQueue: Array<() => void> = [];

    async onModuleInit() {
        await this.getBrowser();
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
    }

    private async launch(): Promise<Browser> {
        const browser = (await puppeteer.launch(LAUNCH_OPTIONS as any)) as unknown as Browser;
        browser.on('disconnected', () => {
            this.logger.warn('Chrome se desconectó, se relanzará en el próximo request');
            if (this.browser === browser) this.browser = null;
        });
        return browser;
    }

    async getBrowser(): Promise<Browser> {
        if (this.browser) return this.browser;
        if (!this.launching) {
            this.launching = this.launch().finally(() => {
                this.launching = null;
            });
        }
        this.browser = await this.launching;
        return this.browser;
    }

    private async acquirePageSlot() {
        while (this.activePages >= MAX_CONCURRENT_PAGES) {
            await new Promise<void>((resolve) => this.pageQueue.push(resolve));
        }
        this.activePages++;
    }

    private releasePageSlot() {
        this.activePages--;
        this.pageQueue.shift()?.();
    }

    // Abre una página nueva, la prepara y garantiza su cierre pase lo que pase.
    async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
        await this.acquirePageSlot();
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();
            try {
                await page.setUserAgent(USER_AGENT);
                await page.setViewport({ width: 1366, height: 768 });
                return await fn(page);
            } finally {
                await page.close().catch(() => {});
            }
        } finally {
            this.releasePageSlot();
        }
    }
}
