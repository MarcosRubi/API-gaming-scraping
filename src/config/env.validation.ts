// Variables de entorno tipadas y validadas al arrancar: si falta algo
// obligatorio, la app no levanta (mejor que fallar a mitad de un request).
// Los valores viven en .env.<APP_ENV> (fuera del repo) o en el entorno del
// contenedor; acá no hay ninguno hardcodeado.

export const APP_ENVS = ['development', 'qa', 'production'] as const;
export type AppEnvName = (typeof APP_ENVS)[number];

export interface AppEnv {
    APP_ENV: AppEnvName;
    PORT: number;
    // Orígenes permitidos (CORS + guard), separados por comas.
    ALLOWED_ORIGINS: string[];
    // Rechazar requests sin cabecera Origin/Referer (curl, navegador directo).
    REQUIRE_ORIGIN: boolean;
    CACHE_REFRESH_CRON: string;
    // Región y idioma para precios y textos de Steam.
    STEAM_COUNTRY: string;
    STEAM_LANGUAGE: string;
    // Self-heal de selectores (opcional: sin key queda desactivado).
    OPENAI_API_KEY?: string;
    SELF_HEAL_MODEL: string;
    SELF_HEAL_COOLDOWN_MS: number;
}

function required(raw: Record<string, unknown>, key: string): string {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Falta la variable de entorno ${key} (ver .env.example)`);
    }
    return value.trim();
}

function optional(raw: Record<string, unknown>, key: string, fallback: string): string {
    const value = raw[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function toNumber(value: string, key: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`${key} debe ser un número (vino "${value}")`);
    return n;
}

export function validateEnv(raw: Record<string, unknown>): AppEnv {
    const appEnv = optional(raw, 'APP_ENV', 'development');
    if (!(APP_ENVS as readonly string[]).includes(appEnv)) {
        throw new Error(`APP_ENV debe ser uno de ${APP_ENVS.join(', ')} (vino "${appEnv}")`);
    }

    return {
        APP_ENV: appEnv as AppEnvName,
        PORT: toNumber(optional(raw, 'PORT', '3000'), 'PORT'),
        ALLOWED_ORIGINS: required(raw, 'ALLOWED_ORIGINS')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        REQUIRE_ORIGIN: optional(raw, 'REQUIRE_ORIGIN', 'false') === 'true',
        CACHE_REFRESH_CRON: optional(raw, 'CACHE_REFRESH_CRON', '0 * * * *'),
        STEAM_COUNTRY: optional(raw, 'STEAM_COUNTRY', 'US'),
        STEAM_LANGUAGE: optional(raw, 'STEAM_LANGUAGE', 'spanish'),
        OPENAI_API_KEY: optional(raw, 'OPENAI_API_KEY', '') || undefined,
        SELF_HEAL_MODEL: optional(raw, 'SELF_HEAL_MODEL', 'gpt-4o-mini'),
        SELF_HEAL_COOLDOWN_MS: toNumber(optional(raw, 'SELF_HEAL_COOLDOWN_MS', '3600000'), 'SELF_HEAL_COOLDOWN_MS'),
    };
}
