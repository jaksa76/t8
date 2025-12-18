/**
 * Unit tests for cache module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { configure } from '../../src/config.js';
import { getCached, setCached, setCachedBatch, getAllCached } from '../../src/cache.js';
import { getTempLocalesDir, cleanTestCache, readCacheFile, writeCacheFile } from '../helpers.js';

test('cache: getCached returns null for non-existent entry', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  const result = await getCached('Hello', 'fr', 'default');
  
  assert.strictEqual(result, null);
  
  await cleanTestCache(localesDir);
});

test('cache: setCached writes and getCached reads back', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  const result = await getCached('Hello', 'fr', 'default');
  
  assert.strictEqual(result, 'Bonjour');
  
  await cleanTestCache(localesDir);
});

test('cache: writes to correct file path', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  
  const fileData = await readCacheFile(localesDir, 'fr', 'default');
  assert.deepStrictEqual(fileData, { 'Hello': 'Bonjour' });
  
  await cleanTestCache(localesDir);
});

test('cache: creates directory structure automatically', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Hallo', 'de', 'default');
  
  const fileData = await readCacheFile(localesDir, 'de', 'default');
  assert.deepStrictEqual(fileData, { 'Hello': 'Hallo' });
  
  await cleanTestCache(localesDir);
});

test('cache: multiple entries in same file', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  await setCached('Goodbye', 'Au revoir', 'fr', 'default');
  await setCached('Welcome', 'Bienvenue', 'fr', 'default');
  
  const hello = await getCached('Hello', 'fr', 'default');
  const goodbye = await getCached('Goodbye', 'fr', 'default');
  const welcome = await getCached('Welcome', 'fr', 'default');
  
  assert.strictEqual(hello, 'Bonjour');
  assert.strictEqual(goodbye, 'Au revoir');
  assert.strictEqual(welcome, 'Bienvenue');
  
  await cleanTestCache(localesDir);
});

test('cache: separate contexts use separate files', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Sign in', 'Se connecter', 'fr', 'default');
  await setCached('Sign in', 'Inscrivez-vous!', 'fr', 'marketing');
  
  const defaultTranslation = await getCached('Sign in', 'fr', 'default');
  const marketingTranslation = await getCached('Sign in', 'fr', 'marketing');
  
  assert.strictEqual(defaultTranslation, 'Se connecter');
  assert.strictEqual(marketingTranslation, 'Inscrivez-vous!');
  
  await cleanTestCache(localesDir);
});

test('cache: separate languages use separate directories', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  await setCached('Hello', 'Hallo', 'de', 'default');
  await setCached('Hello', 'Hola', 'es', 'default');
  
  const fr = await getCached('Hello', 'fr', 'default');
  const de = await getCached('Hello', 'de', 'default');
  const es = await getCached('Hello', 'es', 'default');
  
  assert.strictEqual(fr, 'Bonjour');
  assert.strictEqual(de, 'Hallo');
  assert.strictEqual(es, 'Hola');
  
  await cleanTestCache(localesDir);
});

test('cache: setCachedBatch writes multiple entries', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCachedBatch({
    'Hello': 'Bonjour',
    'Goodbye': 'Au revoir',
    'Welcome': 'Bienvenue'
  }, 'fr', 'default');
  
  const hello = await getCached('Hello', 'fr', 'default');
  const goodbye = await getCached('Goodbye', 'fr', 'default');
  const welcome = await getCached('Welcome', 'fr', 'default');
  
  assert.strictEqual(hello, 'Bonjour');
  assert.strictEqual(goodbye, 'Au revoir');
  assert.strictEqual(welcome, 'Bienvenue');
  
  await cleanTestCache(localesDir);
});

test('cache: getAllCached returns all entries', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  await setCached('Goodbye', 'Au revoir', 'fr', 'default');
  
  const all = await getAllCached('fr', 'default');
  
  assert.deepStrictEqual(all, {
    'Hello': 'Bonjour',
    'Goodbye': 'Au revoir'
  });
  
  await cleanTestCache(localesDir);
});

test('cache: getAllCached returns empty object for non-existent cache', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  const all = await getAllCached('fr', 'default');
  
  assert.deepStrictEqual(all, {});
  
  await cleanTestCache(localesDir);
});

test('cache: can read pre-existing cache file', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  // Manually write cache file
  await writeCacheFile(localesDir, 'fr', 'default', {
    'Hello': 'Bonjour',
    'Goodbye': 'Au revoir'
  });
  
  const hello = await getCached('Hello', 'fr', 'default');
  const goodbye = await getCached('Goodbye', 'fr', 'default');
  
  assert.strictEqual(hello, 'Bonjour');
  assert.strictEqual(goodbye, 'Au revoir');
  
  await cleanTestCache(localesDir);
});

test('cache: updating existing entry overwrites it', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello', 'Bonjour', 'fr', 'default');
  await setCached('Hello', 'Salut', 'fr', 'default');
  
  const result = await getCached('Hello', 'fr', 'default');
  
  assert.strictEqual(result, 'Salut');
  
  await cleanTestCache(localesDir);
});

test('cache: concurrent writes are handled safely', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  // Fire off multiple writes concurrently
  await Promise.all([
    setCached('One', 'Un', 'fr', 'default'),
    setCached('Two', 'Deux', 'fr', 'default'),
    setCached('Three', 'Trois', 'fr', 'default'),
    setCached('Four', 'Quatre', 'fr', 'default'),
    setCached('Five', 'Cinq', 'fr', 'default'),
  ]);
  
  const all = await getAllCached('fr', 'default');
  
  assert.strictEqual(all['One'], 'Un');
  assert.strictEqual(all['Two'], 'Deux');
  assert.strictEqual(all['Three'], 'Trois');
  assert.strictEqual(all['Four'], 'Quatre');
  assert.strictEqual(all['Five'], 'Cinq');
  
  await cleanTestCache(localesDir);
});

test('cache: handles special characters in text', async () => {
  const localesDir = getTempLocalesDir();
  configure({ localesDir });
  
  await setCached('Hello "World"', 'Bonjour "Monde"', 'fr', 'default');
  await setCached("It's working", "Ça marche", 'fr', 'default');
  
  const result1 = await getCached('Hello "World"', 'fr', 'default');
  const result2 = await getCached("It's working", 'fr', 'default');
  
  assert.strictEqual(result1, 'Bonjour "Monde"');
  assert.strictEqual(result2, "Ça marche");
  
  await cleanTestCache(localesDir);
});
