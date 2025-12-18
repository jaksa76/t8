/**
 * Integration tests for batching behavior
 */

import { test } from 'node:test';
import assert from 'node:assert';
import t8 from '../../src/index.js';
import { getTempLocalesDir, cleanTestCache, waitForBatch, readCacheFile } from '../helpers.js';

test('batching: multiple calls are batched together', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // Fire off multiple calls at once
  const promises = [
    t8('Hello', 'fr'),
    t8('Goodbye', 'fr'),
    t8('Welcome', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] Hello');
  assert.strictEqual(results[1], '[fr] Goodbye');
  assert.strictEqual(results[2], '[fr] Welcome');
  
  // All should be in cache
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 3);
  
  await cleanTestCache(localesDir);
});

test('batching: duplicate texts in same batch', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // Multiple calls for same text
  const promises = [
    t8('Hello', 'fr'),
    t8('Hello', 'fr'),
    t8('Hello', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  // All should resolve to same value
  assert.strictEqual(results[0], '[fr] Hello');
  assert.strictEqual(results[1], '[fr] Hello');
  assert.strictEqual(results[2], '[fr] Hello');
  
  await cleanTestCache(localesDir);
});

test('batching: different languages get separate batches', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  const promises = [
    t8('Hello', 'fr'),
    t8('Hello', 'de'),
    t8('Hello', 'es')
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] Hello');
  assert.strictEqual(results[1], '[de] Hello');
  assert.strictEqual(results[2], '[es] Hello');
  
  // Check each language has its own cache
  const frCache = await readCacheFile(localesDir, 'fr', 'default');
  const deCache = await readCacheFile(localesDir, 'de', 'default');
  const esCache = await readCacheFile(localesDir, 'es', 'default');
  
  assert.ok(frCache);
  assert.ok(deCache);
  assert.ok(esCache);
  
  await cleanTestCache(localesDir);
});

test('batching: different contexts get separate batches', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  const promises = [
    t8('Sign in', 'fr', 'default'),
    t8('Sign in', 'fr', 'marketing'),
    t8('Sign in', 'fr', 'legal')
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] Sign in');
  assert.strictEqual(results[1], '[fr] Sign in');
  assert.strictEqual(results[2], '[fr] Sign in');
  
  // Check each context has its own cache file
  const defaultCache = await readCacheFile(localesDir, 'fr', 'default');
  const marketingCache = await readCacheFile(localesDir, 'fr', 'marketing');
  const legalCache = await readCacheFile(localesDir, 'fr', 'legal');
  
  assert.ok(defaultCache);
  assert.ok(marketingCache);
  assert.ok(legalCache);
  
  await cleanTestCache(localesDir);
});

test('batching: cached items skip batching', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // First call - will batch
  await t8('Hello', 'fr');
  
  // Second call - should be immediate from cache
  const start = Date.now();
  const result = await t8('Hello', 'fr');
  const duration = Date.now() - start;
  
  assert.strictEqual(result, '[fr] Hello');
  assert.ok(duration < 10, 'Cached result should be immediate');
  
  await cleanTestCache(localesDir);
});

test('batching: batch flushes after delay', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 20 });
  
  // Start a single request
  const promise = t8('Hello', 'fr');
  
  // Wait for batch delay to pass
  await waitForBatch(30);
  
  const result = await promise;
  
  assert.strictEqual(result, '[fr] Hello');
  
  await cleanTestCache(localesDir);
});

test('batching: batch flushes when size limit reached', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchSize: 3, batchDelay: 100 });
  
  // Queue up exactly batchSize items
  const promises = [
    t8('One', 'fr'),
    t8('Two', 'fr'),
    t8('Three', 'fr')
  ];
  
  // Should flush immediately without waiting for delay
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] One');
  assert.strictEqual(results[1], '[fr] Two');
  assert.strictEqual(results[2], '[fr] Three');
  
  await cleanTestCache(localesDir);
});

test('batching: exceeding batch size triggers immediate flush', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchSize: 2, batchDelay: 100 });
  
  // Queue up more than batchSize
  const promises = [
    t8('One', 'fr'),
    t8('Two', 'fr'),
    t8('Three', 'fr')
  ];
  
  // First two should flush immediately, third starts new batch
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] One');
  assert.strictEqual(results[1], '[fr] Two');
  assert.strictEqual(results[2], '[fr] Three');
  
  await cleanTestCache(localesDir);
});

test('batching: sequential calls with delay between them', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 20 });
  
  const result1 = await t8('Hello', 'fr');
  
  await waitForBatch(30);
  
  const result2 = await t8('Goodbye', 'fr');
  
  assert.strictEqual(result1, '[fr] Hello');
  assert.strictEqual(result2, '[fr] Goodbye');
  
  await cleanTestCache(localesDir);
});

test('batching: staggered calls within batch window', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 50 });
  
  const p1 = t8('One', 'fr');
  
  await new Promise(resolve => setTimeout(resolve, 10));
  const p2 = t8('Two', 'fr');
  
  await new Promise(resolve => setTimeout(resolve, 10));
  const p3 = t8('Three', 'fr');
  
  const results = await Promise.all([p1, p2, p3]);
  
  assert.strictEqual(results[0], '[fr] One');
  assert.strictEqual(results[1], '[fr] Two');
  assert.strictEqual(results[2], '[fr] Three');
  
  // All should be in same batch
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 3);
  
  await cleanTestCache(localesDir);
});

test('batching: mixed cached and uncached calls', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // Prime cache with one item
  await t8('Cached', 'fr');
  
  // Mix of cached and uncached
  const promises = [
    t8('Cached', 'fr'),      // from cache
    t8('Uncached1', 'fr'),   // batched
    t8('Uncached2', 'fr')    // batched
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] Cached');
  assert.strictEqual(results[1], '[fr] Uncached1');
  assert.strictEqual(results[2], '[fr] Uncached2');
  
  await cleanTestCache(localesDir);
});
