// Las tiendas nunca devuelven "sin resultados": GOG muestra el catálogo
// general cuando no encuentra nada, y Fanatical/Instant Gaming hacen búsqueda
// difusa por palabras sueltas. Este scoring decide qué resultados realmente
// se parecen a lo buscado, tolerando typos ("mincraft"), siglas ("gta") y
// subtítulos ("Hollow Knight: Silksong").

const STOPWORDS = new Set(["the", "of", "and", "an", "de", "la", "el", "los", "las", "del", "y"]);

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function bigrams(word) {
    const out = new Set();
    for (let i = 0; i < word.length - 1; i++) out.add(word.slice(i, i + 2));
    return out;
}

// Similitud de Dice entre bigramas: "knigt" vs "knight" ≈ 0.67
function bigramSimilarity(a, b) {
    const gramsA = bigrams(a);
    const gramsB = bigrams(b);
    if (!gramsA.size || !gramsB.size) return 0;
    let shared = 0;
    gramsA.forEach((g) => {
        if (gramsB.has(g)) shared++;
    });
    return (2 * shared) / (gramsA.size + gramsB.size);
}

function relevanceScore(query, title) {
    const q = normalizeText(query);
    const t = normalizeText(title);
    if (!q || !t) return 0;
    if (t.includes(q)) return 1;

    const qTokens = q.split(" ").filter((w) => w.length >= 2 && !STOPWORDS.has(w));
    if (qTokens.length === 0) return 0;
    const tTokens = t.split(" ");

    let matched = 0;
    qTokens.forEach((qt) => {
        const hit = tTokens.some(
            (tt) => tt.includes(qt) || (qt.includes(tt) && tt.length >= 3) || bigramSimilarity(qt, tt) >= 0.6
        );
        if (hit) matched++;
    });

    // Siglas: "gta" contra "Grand Theft Auto V" (iniciales "gtav")
    const initials = tTokens.map((w) => w[0]).join("");
    const initialsHit = qTokens.length === 1 && initials.includes(qTokens[0]);

    return Math.max(matched / qTokens.length, initialsHit ? 0.9 : 0);
}

// Filtra lo que no se parece y ordena lo que sí por afinidad (empates
// conservan el orden original, que es el ranking de la propia tienda).
function filterByRelevance(results, term, threshold = 0.6) {
    const scored = results.map((result, index) => ({
        result,
        index,
        score: relevanceScore(term, result.name),
    }));
    return scored
        .filter((entry) => entry.score >= threshold)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((entry) => entry.result);
}

module.exports = { filterByRelevance, relevanceScore };
