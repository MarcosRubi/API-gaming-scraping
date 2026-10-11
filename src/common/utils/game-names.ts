// Comparación de nombres de juegos entre tiendas.

// Minúsculas y solo alfanuméricos.
export function comparableName(name: string | null | undefined): string {
    return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

// El mismo juego si uno contiene al otro ("Hades" ⊂ "Hades - PC").
export function similarNames(a: string | null | undefined, b: string | null | undefined): boolean {
    const ca = comparableName(a);
    const cb = comparableName(b);
    if (!ca || !cb) return false;
    return ca.includes(cb) || cb.includes(ca);
}

// Quita sufijos de edición y de plataforma para buscar el juego base
// ("X Deluxe Edition - PC (Steam)" → "X").
export function stripEdition(name: string | null | undefined): string {
    return String(name || '')
        .split(' - ')[0]
        .replace(/\(.*?\)/g, '')
        .replace(/[®™©]/g, '')
        .replace(/\b(deluxe|ultimate|gold|standard|definitive|complete|goty|premium)\b/gi, '')
        .replace(/\bedition\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseSteamAppId(url: string | null | undefined): string | null {
    const match = String(url || '').match(/store\.steampowered\.com\/app\/(\d+)/);
    return match ? match[1] : null;
}
