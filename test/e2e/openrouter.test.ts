/**
 * E2E tests for OpenRouter provider
 * 
 * These tests require a real OpenRouter API key.
 * Set T8_OPENROUTER_KEY environment variable to run these tests.
 * They will be skipped if the key is not provided.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import t8 from '../../src/index.js';
import { getTempLocalesDir, cleanTestCache } from '../helpers.js';

const OPENROUTER_KEY = process.env.T8_OPENROUTER_KEY;
const shouldRun = !!OPENROUTER_KEY;

test('openrouter: translates to French', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    localesDir,
    batchDelay: 30
  });
  
  const result = await t8('Hello', 'fr');
  
  assert.notStrictEqual(result, 'Hello');
  assert.ok(
    result.toLowerCase().includes('bonjour') || result.toLowerCase().includes('salut'),
    `Expected French greeting, got: ${result}`
  );
  
  await cleanTestCache(localesDir);
});

test('openrouter: translates to German', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
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

test('openrouter: translates to Spanish', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
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

test('openrouter: preserves placeholders', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    localesDir
  });
  
  const result = await t8('Hello {name}', 'fr');
  
  assert.ok(result.includes('{name}'), `Placeholder not preserved: ${result}`);
  
  await cleanTestCache(localesDir);
});

test('openrouter: batches multiple translations', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    localesDir,
    batchDelay: 30
  });
  
  const promises = [
    t8('Hello', 'fr'),
    t8('Goodbye', 'fr'),
    t8('Welcome', 'fr')
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 3);
  for (const result of results) {
    assert.notStrictEqual(result, 'Hello');
    assert.notStrictEqual(result, 'Goodbye');
    assert.notStrictEqual(result, 'Welcome');
  }
  
  await cleanTestCache(localesDir);
});

test('openrouter: uses cache on second call', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    localesDir
  });
  
  const result1 = await t8('Good morning', 'fr');
  const result2 = await t8('Good morning', 'fr');
  
  assert.strictEqual(result1, result2);
  
  await cleanTestCache(localesDir);
});

test('openrouter: works with different models', { skip: !shouldRun }, async () => {
  const localesDir = getTempLocalesDir();
  t8.configure({
    provider: 'openrouter',
    apiKey: OPENROUTER_KEY!,
    model: 'meta-llama/llama-3.1-8b-instruct',
    localesDir
  });
  
  const result = await t8('Hello', 'fr');
  
  assert.notStrictEqual(result, 'Hello');
  
  await cleanTestCache(localesDir);
});
