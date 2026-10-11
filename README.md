# GameScraping API

API que obtiene nombre, precio, imagen, descuento, categorías y URL de videojuegos en [Steam](https://store.steampowered.com/?l=spanish), [GOG](https://gog.com/), [Instant Gaming](https://www.instant-gaming.com/), [Humble Store](https://www.humblebundle.com/store) y [Fanatical](https://www.fanatical.com/), y los devuelve en JSON. La consume el frontend de [games-scraping.mrubi.dev](https://games-scraping.mrubi.dev).

## Tecnologías
- [NestJS](https://nestjs.com/) + TypeScript
- [Puppeteer](https://pptr.dev/) (puppeteer-extra + stealth) con un Chrome persistente
- `@nestjs/schedule` para refrescar la caché de listados
- OpenAI (opcional) para auto-reparar selectores cuando una tienda cambia su HTML

## Estructura

```
src/
  main.ts                    arranque: CORS, morgan, shutdown hooks
  app.module.ts              config global, guard de origen, filtro de errores
  games/                     GamesController: rutas HTTP
  scrapers/                  motor genérico, relevancia, screenshots, catálogo por tienda
  selectors/                 selectores por tienda (JSON) + overrides del self-heal
  self-heal/                 reparación de selectores con OpenAI + validación
  categories/                normalización y caché de géneros por URL
  cache/                     caché de listados (snapshot en disco) + cron
  browser/                   Chrome compartido con límite de pestañas
  common/                    tipos, utilidades HTTP/JSON, guard y filtro
data/                        persistencia en JSON (montado como volumen en Docker)
```

No usa base de datos: la caché de listados, la de categorías y los overrides de selectores son archivos JSON en `data/`.

## Rutas

Respuesta de un juego:
```json
{
  "name": "Hollow Knight",
  "imgUrl": "https://...",
  "price": [{ "now": "US$4.99" }, { "old": "US$14.99" }],
  "discount": "-67%",
  "url": "https://...",
  "categories": ["Acción", "Aventura"],
  "screenshots": ["https://..."]
}
```
`price` trae solo `now` cuando no hay descuento. `screenshots` solo viene en las listas del banner.

### Búsqueda en vivo
`/steam/:juego`, `/gog/:juego`, `/instant-gaming/:juego`, `/humble/:juego`, `/fanatical/:juego`

Si la tienda no tiene el juego devuelve `{ "<tienda>": "null" }`.

### Listados (servidos desde la caché, se refrescan cada hora)
| Tienda | Rutas |
|---|---|
| Steam | `/top-sellers-steam`, `/top-offers-steam`, `/new-releases-steam`, `/overwhelmingly-positive-steam` |
| GOG | `/top-sellers-gog`, `/top-old-games-gog`, `/new-releases-gog`, `/best-rated-gog` |
| Instant Gaming | `/top-sellers-instant-gaming`, `/top-offers-instant-gaming`, `/top-indie-games-instant-gaming`, `/best-rated-instant-gaming` |
| Humble | `/top-sellers-humble`, `/new-releases-humble`, `/top-offers-humble` |
| Fanatical | `/top-sellers-fanatical`, `/new-releases-fanatical`, `/top-offers-fanatical` |

Cada listado envía la cabecera `X-Cache-Updated-At`. Si un scrape falla responde `502`.

## Desarrollo

Requiere Node ≥ 20.19.

```bash
npm install
cp .env.example .env
npm run dev        # compila en modo watch y reinicia al guardar
npm run build      # compila a dist/
npm start          # ejecuta dist/main.js
```

En desarrollo se usa el Chromium que descarga `puppeteer`; en Docker, el del sistema (`PUPPETEER_EXECUTABLE_PATH`).

### Variables de entorno
| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `CACHE_REFRESH_CRON` | `0 * * * *` | Frecuencia de refresco de los listados |
| `ALLOWED_ORIGIN` | frontend publicado / localhost en dev | Orígenes permitidos, separados por comas |
| `OPENAI_API_KEY` | — | Activa el self-heal de selectores (opcional) |
| `SELF_HEAL_MODEL` | `gpt-4o-mini` | Modelo usado por el self-heal |
| `SELF_HEAL_COOLDOWN_MS` | `3600000` | Espera mínima entre intentos por sitio/listado |

## Docker
```bash
docker compose up -d --build
```

## Autor
- Sitio web - [Marcos Rubí](https://mrubi.vercel.app/)
