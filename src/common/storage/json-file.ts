import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Lee un JSON de disco; null si el archivo todavía no existe.
export async function readJsonFile<T>(path: string): Promise<T | null> {
    try {
        return JSON.parse(await readFile(path, 'utf-8')) as T;
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
    }
}

// Escritura atómica (tmp + rename): un crash a mitad de escritura no deja
// el JSON corrupto.
export async function writeJsonFile(path: string, value: unknown): Promise<void> {
    const tmpPath = `${path}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(tmpPath, JSON.stringify(value), 'utf-8');
    await rename(tmpPath, path);
}

export async function appendJsonLine(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(value)}\n`, 'utf-8');
}
