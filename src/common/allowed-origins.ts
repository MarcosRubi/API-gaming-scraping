const PRODUCTION_ORIGINS = ['https://games-scraping.mrubi.dev'];
const DEV_ORIGINS = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

export const isProduction = () => process.env.NODE_ENV === 'production';

// En producción solo el frontend publicado; en dev los puertos locales del
// frontend (Angular 4200, Vite 5173) y de la propia API. ALLOWED_ORIGIN (separado por comas) los pisa.
export function allowedOrigins(): string[] {
    if (process.env.ALLOWED_ORIGIN) {
        return process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim());
    }
    return isProduction() ? PRODUCTION_ORIGINS : DEV_ORIGINS;
}
