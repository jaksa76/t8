/**
 * Integration tests for concurrent requests
 */

import { test } from 'node:test';
import assert from 'node:assert';
import t8 from '../../src/index.js';
import { getTempLocalesDir, cleanTestCache, readCacheFile } from '../helpers.js';

test('concurrent: handles many simultaneous requests', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30, batchSize: 100 });
  
  // Fire off 50 concurrent requests
  const promises = Array.from({ length: 50 }, (_, i) => 
    t8(`Text ${i}`, 'fr')
  );
  
  const results = await Promise.all(promises);
  
  // All should complete successfully
  assert.strictEqual(results.length, 50);
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(results[i], `[fr] Text ${i}`);
  }
  
  // All should be in cache
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 50);
  
  await cleanTestCache(localesDir);
});

test('concurrent: handles 100 requests safely', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30, batchSize: 150 });
  
  const promises = Array.from({ length: 100 }, (_, i) => 
    t8(`Message ${i}`, 'fr')
  );
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 100);
  
  // Verify all translations are correct
  for (let i = 0; i < 100; i++) {
    assert.strictEqual(results[i], `[fr] Message ${i}`);
  }
  
  // Cache should have all 100 entries
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 100);
  
  await cleanTestCache(localesDir);
});

test('concurrent: multiple languages at once', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  const languages = ['fr', 'de', 'es', 'it', 'pt'];
  const promises: Promise<string>[] = [];
  
  // 10 requests per language
  for (const lang of languages) {
    for (let i = 0; i < 10; i++) {
      promises.push(t8(`Text ${i}`, lang));
    }
  }
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 50);
  
  // Verify each language cache
  for (const lang of languages) {
    const cache = await readCacheFile(localesDir, lang, 'default');
    assert.strictEqual(Object.keys(cache!).length, 10);
  }
  
  await cleanTestCache(localesDir);
});

test('concurrent: multiple contexts at once', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  const contexts = ['default', 'marketing', 'legal', 'technical'];
  const promises: Promise<string>[] = [];
  
  // 10 requests per context
  for (const ctx of contexts) {
    for (let i = 0; i < 10; i++) {
      promises.push(t8(`Text ${i}`, 'fr', ctx));
    }
  }
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 40);
  
  // Verify each context cache
  for (const ctx of contexts) {
    const cache = await readCacheFile(localesDir, 'fr', ctx);
    assert.strictEqual(Object.keys(cache!).length, 10);
  }
  
  await cleanTestCache(localesDir);
});

test('concurrent: mixed new and cached requests', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // Prime cache with some entries
  await Promise.all([
    t8('Cached 1', 'fr'),
    t8('Cached 2', 'fr'),
    t8('Cached 3', 'fr')
  ]);
  
  // Mix cached and new requests
  const promises = [
    t8('Cached 1', 'fr'),
    t8('New 1', 'fr'),
    t8('Cached 2', 'fr'),
    t8('New 2', 'fr'),
    t8('Cached 3', 'fr'),
    t8('New 3', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results[0], '[fr] Cached 1');
  assert.strictEqual(results[1], '[fr] New 1');
  assert.strictEqual(results[2], '[fr] Cached 2');
  assert.strictEqual(results[3], '[fr] New 2');
  assert.strictEqual(results[4], '[fr] Cached 3');
  assert.strictEqual(results[5], '[fr] New 3');
  
  await cleanTestCache(localesDir);
});

test('concurrent: rapid sequential batches', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 10, batchSize: 50 });
  
  // Create multiple small batches in quick succession
  const batch1 = Promise.all([
    t8('A1', 'fr'), t8('A2', 'fr'), t8('A3', 'fr')
  ]);
  
  const batch2 = Promise.all([
    t8('B1', 'fr'), t8('B2', 'fr'), t8('B3', 'fr')
  ]);
  
  const batch3 = Promise.all([
    t8('C1', 'fr'), t8('C2', 'fr'), t8('C3', 'fr')
  ]);
  
  const [results1, results2, results3] = await Promise.all([batch1, batch2, batch3]);
  
  assert.strictEqual(results1.length, 3);
  assert.strictEqual(results2.length, 3);
  assert.strictEqual(results3.length, 3);
  
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 9);
  
  await cleanTestCache(localesDir);
});

test('concurrent: no race conditions in cache writes', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30, batchSize: 50 });
  
  // Write to same language/context from multiple batches
  const promises: Promise<string>[] = [];
  
  // Batch 1
  for (let i = 0; i < 20; i++) {
    promises.push(t8(`Batch1-${i}`, 'fr'));
  }
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 5));
  
  // Batch 2 (might overlap with batch 1)
  for (let i = 0; i < 20; i++) {
    promises.push(t8(`Batch2-${i}`, 'fr'));
  }
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 40);
  
  // Cache should have all entries without corruption
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 40);
  
  // Verify no missing entries
  for (let i = 0; i < 20; i++) {
    assert.ok(cache![`Batch1-${i}`]);
    assert.ok(cache![`Batch2-${i}`]);
  }
  
  await cleanTestCache(localesDir);
});

test('concurrent: stress test with varied load', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 20 });
  
  const promises: Promise<string>[] = [];
  
  // Different languages, contexts, and texts
  const languages = ['fr', 'de', 'es'];
  const contexts = ['default', 'marketing'];
  
  for (let i = 0; i < 30; i++) {
    const lang = languages[i % languages.length];
    const ctx = contexts[i % contexts.length];
    promises.push(t8(`Message ${i}`, lang, ctx));
  }
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 30);
  
  // Verify results are correct
  for (let i = 0; i < 30; i++) {
    const lang = languages[i % languages.length];
    assert.strictEqual(results[i], `[${lang}] Message ${i}`);
  }
  
  await cleanTestCache(localesDir);
});

test('concurrent: handles duplicate requests in same batch', async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({ provider: 'mock', localesDir, batchDelay: 30 });
  
  // Multiple identical requests
  const promises = [
    t8('Same text', 'fr'),
    t8('Same text', 'fr'),
    t8('Same text', 'fr'),
    t8('Same text', 'fr'),
    t8('Same text', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  // All should resolve to same translation
  for (const result of results) {
    assert.strictEqual(result, '[fr] Same text');
  }
  
  // Cache should only have one entry
  const cache = await readCacheFile(localesDir, 'fr', 'default');
  assert.strictEqual(Object.keys(cache!).length, 1);
  assert.strictEqual(cache!['Same text'], '[fr] Same text');
  
  await cleanTestCache(localesDir);
});
