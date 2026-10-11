// Normaliza los géneros que cada tienda escribe a su manera (inglés,
// español, variantes) a un set canónico de etiquetas en español, para que
// el filtro de categorías del frontend agrupe bien entre tiendas.

const CANONICAL: Record<string, string> = {
    // Acción
    'action': 'Acción',
    'acción': 'Acción',
    'accion': 'Acción',
    'action-adventure': 'Acción',
    'acción y aventura': 'Acción',
    // Aventura
    'adventure': 'Aventura',
    'aventura': 'Aventura',
    // RPG
    'rpg': 'RPG',
    'role-playing': 'RPG',
    'roleplaying': 'RPG',
    'role playing': 'RPG',
    'action rpg': 'RPG',
    'jrpg': 'RPG',
    'rol': 'RPG',
    'juego de rol': 'RPG',
    'rol y acción': 'RPG',
    // Estrategia
    'strategy': 'Estrategia',
    'estrategia': 'Estrategia',
    'rts': 'Estrategia',
    'tactical': 'Estrategia',
    'táctica': 'Estrategia',
    // Simulación
    'simulation': 'Simulación',
    'simulación': 'Simulación',
    'simulacion': 'Simulación',
    'simulator': 'Simulación',
    'building': 'Simulación',
    'management': 'Simulación',
    // Deportes
    'sports': 'Deportes',
    'deportes': 'Deportes',
    'sport': 'Deportes',
    'deporte': 'Deportes',
    // Fantasía
    'fantasy': 'Fantasía',
    'fantasía': 'Fantasía',
    // Carreras
    'racing': 'Carreras',
    'carreras': 'Carreras',
    // Shooter
    'shooter': 'Shooter',
    'fps': 'Shooter',
    'first-person shooter': 'Shooter',
    'disparos': 'Shooter',
    // Terror
    'horror': 'Terror',
    'terror': 'Terror',
    'survival horror': 'Terror',
    // Plataformas
    'platformer': 'Plataformas',
    'platform': 'Plataformas',
    'plataformas': 'Plataformas',
    // Puzzle
    'puzzle': 'Puzzle',
    'puzles': 'Puzzle',
    'puzzles': 'Puzzle',
    // Indie
    'indie': 'Indie',
    // Casual
    'casual': 'Casual',
    // Supervivencia
    'survival': 'Supervivencia',
    'supervivencia': 'Supervivencia',
    // Mundo abierto
    'open world': 'Mundo abierto',
    'mundo abierto': 'Mundo abierto',
    'open-world': 'Mundo abierto',
    // Lucha
    'fighting': 'Lucha',
    'lucha': 'Lucha',
    'combat': 'Lucha',
    'combate': 'Lucha',
    // Multijugador
    'multiplayer': 'Multijugador',
    'multijugador': 'Multijugador',
    'mmo': 'Multijugador',
    'massively multiplayer': 'Multijugador',
    'co-op': 'Multijugador',
    // Free to Play
    'free to play': 'Free to Play',
    'free-to-play': 'Free to Play',
    'f2p': 'Free to Play',
    // Acceso anticipado
    'early access': 'Acceso anticipado',
    'acceso anticipado': 'Acceso anticipado',
    // Sigilo
    'stealth': 'Sigilo',
    'sigilo': 'Sigilo',
    // Roguelike
    'roguelike': 'Roguelike',
    'rogue-like': 'Roguelike',
    'roguelite': 'Roguelike',
    'rogue-lite': 'Roguelike',
    // Souls-like
    'souls-like': 'Souls-like',
    'soulslike': 'Souls-like',
    // Narrativo
    'story rich': 'Narrativo',
    'narrativo': 'Narrativo',
    'visual novel': 'Narrativo',
    'novela visual': 'Narrativo',
};

// Géneros/tags que no aportan al filtro (metadatos, plataformas, ruido).
const IGNORE = new Set([
    'software', 'utilities', 'video production', 'game development',
    'animation & modeling', 'design & illustration', 'web publishing',
    'audio production', 'photo editing', 'education', 'accounting',
    'exploration', 'atmospheric', 'singleplayer', 'single-player',
    'third person', 'tercera persona', 'first person', 'primera persona',
    '2d', '3d', 'pixel graphics', 'classic', 'great soundtrack', 'anime',
]);

const MAX_CATEGORIES = 4;

// Recibe la lista cruda de una tienda y devuelve etiquetas canónicas
// únicas (máx. 4). Los géneros desconocidos pasan tal cual (capitalizados)
// salvo que sean ruido conocido o demasiado largos para ser un género real.
export function normalizeCategories(rawList: unknown): string[] {
    if (!Array.isArray(rawList)) return [];
    const out: string[] = [];
    for (const raw of rawList) {
        const clean = String(raw || '')
            .replace(/[,;]+$/, '')
            .trim();
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (IGNORE.has(key)) continue;

        let label = CANONICAL[key];
        if (!label) {
            if (clean.length > 22) continue; // frases largas: no es un género
            label = clean.charAt(0).toUpperCase() + clean.slice(1);
        }
        if (!out.includes(label)) out.push(label);
        if (out.length >= MAX_CATEGORIES) break;
    }
    return out;
}

