export const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// fetch con timeout; devuelve null si la respuesta no es 2xx o si falla/aborta.
export async function fetchWithTimeout(
    url: string,
    timeoutMs: number,
    headers?: Record<string, string>,
): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, headers });
        return res.ok ? res : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchJson<T = any>(url: string, timeoutMs: number): Promise<T | null> {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res) return null;
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
    const res = await fetchWithTimeout(url, timeoutMs, {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es,en;q=0.8',
    });
    return res ? res.text() : null;
}
