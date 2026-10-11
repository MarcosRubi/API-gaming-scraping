// node --test (Node 24 importa el .ts quitando los tipos).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTerm, SearchCache } from './search-cache.ts';

function setup(ttl = () => 1000) {
    let now = 0;
    const cache = new SearchCache({ ttlMs: ttl, maxEntries: 2, now: () => now });
    return { cache, advance: (ms) => (now += ms) };
}

test('reutiliza el resultado hasta que vence', async () => {
    const { cache, advance } = setup();
    let calls = 0;
    const load = async () => ++calls;
    assert.equal(await cache.get('k', load), 1);
    advance(999);
    assert.equal(await cache.get('k', load), 1);
    advance(2);
    assert.equal(await cache.get('k', load), 2);
});

test('búsquedas iguales en paralelo comparten la petición', async () => {
    const { cache } = setup();
    let calls = 0;
    const load = () => new Promise((resolve) => setTimeout(() => resolve(++calls), 5));
    const [a, b] = await Promise.all([cache.get('k', load), cache.get('k', load)]);
    assert.deepEqual([a, b, calls], [1, 1, 1]);
});

test('los errores no se cachean', async () => {
    const { cache } = setup();
    await assert.rejects(cache.get('k', () => Promise.reject(new Error('403'))));
    assert.equal(await cache.get('k', async () => 'ok'), 'ok');
});

test('ttl 0 no cachea y la duración depende del valor', async () => {
    const { cache, advance } = setup((value) => (value === 'corto' ? 10 : 0));
    let calls = 0;
    await cache.get('a', async () => (++calls, 'nada'));
    await cache.get('a', async () => (++calls, 'nada'));
    assert.equal(calls, 2);
    await cache.get('b', async () => 'corto');
    advance(11);
    assert.equal(await cache.get('b', async () => 'nuevo'), 'nuevo');
});

test('descarta la entrada más vieja al pasar el máximo', async () => {
    const { cache } = setup();
    await cache.get('a', async () => 'a1');
    await cache.get('b', async () => 'b1');
    await cache.get('c', async () => 'c1');
    assert.equal(await cache.get('a', async () => 'a2'), 'a2');
    assert.equal(await cache.get('c', async () => 'c2'), 'c1');
});

test('normaliza mayúsculas y espacios', () => {
    assert.equal(normalizeTerm('  Hollow   KNIGHT '), 'hollow knight');
});
