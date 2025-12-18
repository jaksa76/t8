/**
 * E2E tests for OpenAI provider
 * 
 * These tests require a real OpenAI API key.
 * Set T8_OPENAI_KEY environment variable to run these tests.
 * They will be skipped if the key is not provided.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import t8 from '../../src/index.js';
import { getTempLocalesDir, cleanTestCache } from '../helpers.js';

const OPENAI_KEY = process.env.T8_OPENAI_KEY;
const shouldRun = !!OPENAI_KEY;

test('openai: translates to French', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    model: 'gpt-4o-mini',
    localesDir,
    batchDelay: 30
  });
  
  const result = await t8('Hello', 'fr');
  
  // Should not be the original English text
  assert.notStrictEqual(result, 'Hello');
  
  // Should contain expected French translation
  assert.ok(
    result.toLowerCase().includes('bonjour') || result.toLowerCase().includes('salut'),
    `Expected French greeting, got: ${result}`
  );
  
  await cleanTestCache(localesDir);
});

test('openai: translates to German', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    model: 'gpt-4o-mini',
    localesDir
  });
  
  const result = await t8('Hello', 'de');
  
  assert.notStrictEqual(result, 'Hello');
  assert.ok(
    result.toLowerCase().includes('hallo') || result.toLowerCase().includes('guten'),
    `Expected German greeting, got: ${result}`
  );
  
  await cleanTestCache(localesDir);
});

test('openai: translates to Spanish', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    model: 'gpt-4o-mini',
    localesDir
  });
  
  const result = await t8('Hello', 'es');
  
  assert.notStrictEqual(result, 'Hello');
  assert.ok(
    result.toLowerCase().includes('hola'),
    `Expected Spanish greeting, got: ${result}`
  );
  
  await cleanTestCache(localesDir);
});

test('openai: preserves placeholders', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    localesDir
  });
  
  const result = await t8('Hello {name}', 'fr');
  
  // Should contain the placeholder
  assert.ok(result.includes('{name}'), `Placeholder not preserved: ${result}`);
  
  await cleanTestCache(localesDir);
});

test('openai: batches multiple translations', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    localesDir,
    batchDelay: 30
  });
  
  const promises = [
    t8('Hello', 'fr'),
    t8('Goodbye', 'fr'),
    t8('Welcome', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  // All should be translated
  assert.strictEqual(results.length, 3);
  for (const result of results) {
    assert.notStrictEqual(result, 'Hello');
    assert.notStrictEqual(result, 'Goodbye');
    assert.notStrictEqual(result, 'Welcome');
  }
  
  await cleanTestCache(localesDir);
});

test('openai: uses cache on second call', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openai',
    apiKey: OPENAI_KEY!,
    localesDir
  });
  
  const result1 = await t8('Good morning', 'fr');
  const result2 = await t8('Good morning', 'fr');
  
  // Second call should return exact same translation from cache
  assert.strictEqual(result1, result2);
  
  await cleanTestCache(localesDir);
});
