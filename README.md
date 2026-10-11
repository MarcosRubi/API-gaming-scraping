# GameScraping API

API de [games-scraping.mrubi.dev](https://games-scraping.mrubi.dev). Junta precios de [Steam](https://store.steampowered.com/), [GOG](https://gog.com/), [Instant Gaming](https://www.instant-gaming.com/), [Humble Store](https://www.humblebundle.com/store) y [Fanatical](https://www.fanatical.com/), y arma las listas de la home (destacados, ofertas, próximos, géneros, noticias) con las APIs públicas de Steam.

## Tecnologías
- [NestJS](https://nestjs.com/) + TypeScript
- [Puppeteer](https://pptr.dev/) (puppeteer-extra + stealth) con un Chrome persistente para el scraping
- APIs JSON públicas de Steam (sin key): tienda, fichas, reseñas, assets y noticias
- `@nestjs/schedule` para refrescar la caché cada hora
- OpenAI (opcional) para auto-reparar selectores cuando una tienda cambia su HTML

## Estructura

```
src/
  main.ts                     arranque: CORS, logs, shutdown hooks
  app.module.ts
  config/                     variables de entorno validadas (env.validation.ts) y AppConfigService
  common/
    filters/  guards/         filtro de errores (502) y guard de origen
    http/                     fetch con timeout, limitador de concurrencia, caché TTL
    storage/                  JSON atómico en data/
    types/  utils/            tipos compartidos y comparación de nombres
  infrastructure/browser/     Chrome compartido con límite de pestañas
  modules/
    scraping/                 motor de scraping, selectores por tienda, self-heal, screenshots
    steam/                    cliente de las APIs de Steam, listas de la home, géneros, noticias
    categories/               normalización y caché de géneros por URL
    listings/                 registro de fuentes, caché con snapshot, cron y GET /listings/:key
    search/                   búsqueda en vivo por tienda
    health/                   GET /health
data/                         cachés de runtime (no se versiona; volumen en Docker)
```

Sin base de datos: las cachés (listas, categorías, equivalencias y fichas de Steam, overrides de selectores) son JSON en `data/`.

## Endpoints

| Ruta | Qué devuelve |
|---|---|
| `GET /listings/:key` | Una lista cacheada (cabecera `X-Cache-Updated-At`) |
| `GET /search/:tienda/:juego` | Búsqueda en vivo: `steam`, `gog`, `instant-gaming`, `humble`, `fanatical`. Si no está: `{ "<tienda>": "null" }` |
| `GET /news` | Últimas noticias oficiales de los más vendidos |
| `GET /health` | `{ "status": "ok" }` |

Claves de `/listings`:
- **Steam (API):** `steam-spotlight` (hero, con ficha y tráilers), `steam-feature` (juego destacado con tráilers), `steam-specials`, `steam-coming-soon`, `steam-new-releases`, `steam-top-sellers`, `genre-{action,adventure,casual,horror,indie,racing,rpg,simulation}`
- **Scraping por tienda:** `top-sellers-*`, `top-offers-*`, `new-releases-*`, `best-rated-*`, `overwhelmingly-positive-steam`, `top-old-games-gog`, `top-indie-games-instant-gaming`

Cada juego trae `name`, `imgUrl`, `price`, `discount`, `url`, `categories` y, si tiene equivalente en Steam, `steamAppId`, `rating` (0-5), `ratingCount` y `art` (portada vertical, arte hero y header). Las listas de Steam filtran contenido adulto y software.

## Entornos y scripts

Requiere Node ≥ 20.19. Las variables viven en `.env.<entorno>` (no se versionan); la plantilla documentada es [.env.example](.env.example).

```bash
npm install
cp .env.example .env.development   # y completá los valores
cp .env.example .env.qa

npm run start:dev    # APP_ENV=development, compila en watch y reinicia al guardar
npm run start:qa     # APP_ENV=qa: build + arranque con las variables del VPS
npm run build        # compila a dist/
npm start            # dist/main.js con las variables del entorno (Docker)
```

Si falta una variable obligatoria (por ejemplo `ALLOWED_ORIGINS`) la app no arranca y dice cuál falta.

## Docker
```bash
docker compose up -d --build   # usa .env.qa
```
En el VPS se levanta con el compose de la raíz junto al frontend.

## Autor
- Sitio web - [Marcos Rubí](https://mrubi.vercel.app/)
