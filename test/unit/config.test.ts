/**
 * Unit tests for config module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { configure, getConfig } from '../../src/config.js';

test('config: loads defaults', () => {
  const config = getConfig();
  
  assert.strictEqual(config.provider, 'openai');
  assert.strictEqual(config.model, 'gpt-4o-mini');
  assert.strictEqual(config.localesDir, './locales');
  assert.strictEqual(config.maxExamples, 50);
  assert.strictEqual(config.batchSize, 25);
  assert.strictEqual(config.batchDelay, 20);
});

test('config: can override with configure()', () => {
  configure({ provider: 'mock' });
  
  const config = getConfig();
  assert.strictEqual(config.provider, 'mock');
  
  // Reset
  configure({ provider: 'openai' });
});

test('config: can override API key', () => {
  configure({ apiKey: 'test-key-123' });
  
  const config = getConfig();
  assert.strictEqual(config.apiKey, 'test-key-123');
  
  // Reset
  configure({ apiKey: '' });
});

test('config: can override model', () => {
  configure({ model: 'gpt-4' });
  
  const config = getConfig();
  assert.strictEqual(config.model, 'gpt-4');
  
  // Reset
  configure({ model: 'gpt-4o-mini' });
});

test('config: can override localesDir', () => {
  configure({ localesDir: '/tmp/locales' });
  
  const config = getConfig();
  assert.strictEqual(config.localesDir, '/tmp/locales');
  
  // Reset
  configure({ localesDir: './locales' });
});

test('config: can override maxExamples', () => {
  configure({ maxExamples: 100 });
  
  const config = getConfig();
  assert.strictEqual(config.maxExamples, 100);
  
  // Reset
  configure({ maxExamples: 50 });
});

test('config: can override batch settings', () => {
  configure({ batchSize: 10, batchDelay: 5 });
  
  const config = getConfig();
  assert.strictEqual(config.batchSize, 10);
  assert.strictEqual(config.batchDelay, 5);
  
  // Reset
  configure({ batchSize: 25, batchDelay: 20 });
});

test('config: partial override keeps other values', () => {
  const original = getConfig();
  
  configure({ provider: 'gemini' });
  
  const config = getConfig();
  assert.strictEqual(config.provider, 'gemini');
  assert.strictEqual(config.model, original.model);
  assert.strictEqual(config.localesDir, original.localesDir);
  
  // Reset
  configure({ provider: 'openai' });
});

test('config: multiple overrides accumulate', () => {
  configure({ provider: 'mock' });
  configure({ model: 'test-model' });
  configure({ batchSize: 5 });
  
  const config = getConfig();
  assert.strictEqual(config.provider, 'mock');
  assert.strictEqual(config.model, 'test-model');
  assert.strictEqual(config.batchSize, 5);
  
  // Reset
  configure({ provider: 'openai', model: 'gpt-4o-mini', batchSize: 25 });
});

test('config: getConfig returns a copy', () => {
  const config1 = getConfig();
  const config2 = getConfig();
  
  assert.notStrictEqual(config1, config2);
  assert.deepStrictEqual(config1, config2);
});
