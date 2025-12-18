/**
 * Integration tests for t8 main function
 */

import { test } from 'node:test';
import assert from 'node:assert';
import t8 from '../../src/index.js';
import { getTempLocalesDir, cleanTestCache, readCacheFile, writeCacheFile } from '../helpers.js';

test('t8: translates with mock provider', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const result = await t8('Hello', 'fr');
  
  assert.strictEqual(result, '[fr] Hello');
  
  await cleanTestCache(localesDir);
});

test('t8: uses cache on second call', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const result1 = await t8('Hello', 'fr');
  const result2 = await t8('Hello', 'fr');
  
  assert.strictEqual(result1, '[fr] Hello');
  assert.strictEqual(result2, '[fr] Hello');
  
  // Check cache file was written
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.deepStrictEqual(cache, { 'Hello': '[fr] Hello' });
  
  await cleanTestCache(localesDir);
});

test('t8: uses default context', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  await t8('Hello', 'fr');
  
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.ok(cache);
  assert.strictEqual(cache['Hello'], '[fr] Hello');
  
  await cleanTestCache(localesDir);
});

test('t8: uses custom context', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  await t8('Hello', 'fr', 'marketing');
  
  const cache = await readCacheFile(localesDir, 'fr', 'marketing');
  assert.ok(cache);
  assert.strictEqual(cache['Hello'], '[fr] Hello');
  
  await cleanTestCache(localesDir);
});

test('t8: different contexts are independent', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  await t8('Sign in', 'fr', 'default');
  await t8('Sign in', 'fr', 'marketing');
  
  const defaultCache = await readCacheFile(localesDir, 'fr', 'default');
  const marketingCache = await readCacheFile(localesDir, 'fr', 'marketing');
  
  assert.strictEqual(defaultCache!['Sign in'], '[fr] Sign in');
  assert.strictEqual(marketingCache!['Sign in'], '[fr] Sign in');
  
  await cleanTestCache(localesDir);
});

test('t8: reads from pre-existing cache', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  // Pre-populate cache with custom translation
  await writeCacheFile(localesDir, 'fr', 'default', {
    'Hello': 'Custom Translation'
  });
  
  const result = await t8('Hello', 'fr');
  
  // Should use cache, not call provider
  assert.strictEqual(result, 'Custom Translation');
  
  await cleanTestCache(localesDir);
});

test('t8: multiple languages work independently', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const fr = await t8('Hello', 'fr');
  const de = await t8('Hello', 'de');
  const es = await t8('Hello', 'es');
  
  assert.strictEqual(fr, '[fr] Hello');
  assert.strictEqual(de, '[de] Hello');
  assert.strictEqual(es, '[es] Hello');
  
  await cleanTestCache(localesDir);
});

test('t8.for: creates bound translator', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const translateToFrench = t8.for('fr');
  
  const result1 = await translateToFrench('Hello');
  const result2 = await translateToFrench('Goodbye');
  
  assert.strictEqual(result1, '[fr] Hello');
  assert.strictEqual(result2, '[fr] Goodbye');
  
  await cleanTestCache(localesDir);
});

test('t8.for: works with custom context', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const translateMarketing = t8.for('fr', 'marketing');
  
  const result = await translateMarketing('Sign up now!');
  
  assert.strictEqual(result, '[fr] Sign up now!');
  
  const cache = await readCacheFile(localesDir, 'fr', 'marketing');
  assert.ok(cache);
  assert.strictEqual(cache['Sign up now!'], '[fr] Sign up now!');
  
  await cleanTestCache(localesDir);
});

test('t8: handles empty string', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const result = await t8('', 'fr');
  
  assert.strictEqual(result, '[fr] ');
  
  await cleanTestCache(localesDir);
});

test('t8: handles multi-line text', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const multiline = 'Hello\nWorld\nHow are you?';
  const result = await t8(multiline, 'fr');
  
  assert.strictEqual(result, `[fr] ${multiline}`);
  
  await cleanTestCache(localesDir);
});

test('t8: handles text with placeholders', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const result = await t8('Hello {name}', 'fr');
  
  assert.strictEqual(result, '[fr] Hello {name}');
  
  await cleanTestCache(localesDir);
});

test('t8: handles HTML tags', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir });
  
  const result = await t8('<strong>Hello</strong> World', 'fr');
  
  assert.strictEqual(result, '[fr] <strong>Hello</strong> World');
  
  await cleanTestCache(localesDir);
});

test('t8: configuration changes are reflected', async () => {
  const localesDir1 = getTempLocalesDir();
  const localesDir2 = getTempLocalesDir();
  
  t8.configure({ provider: 'mock', localesDir: localesDir1 });
  await t8('Hello', 'fr');
  
  t8.configure({ localesDir: localesDir2 });
  await t8('Goodbye', 'fr');
  
  const cache1 = await readCacheFile(localesDir1, 'fr', 'default');
  const cache2 = await readCacheFile(localesDir2, 'fr', 'default');
  
  assert.ok(cache1);
  assert.ok(cache2);
  assert.strictEqual(cache1['Hello'], '[fr] Hello');
  assert.strictEqual(cache2['Goodbye'], '[fr] Goodbye');
  
  await cleanTestCache(localesDir1);
  await cleanTestCache(localesDir2);
});
