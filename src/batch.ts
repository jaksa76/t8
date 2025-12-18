/**
 * Transparent request batching
 */

import { getConfig } from './config.js';
import { getAllCached, setCachedBatch } from './cache.js';
import { createProvider } from './providers/provider.js';

/**
 * Queued request waiting for batch processing
 */
interface QueueItem {
  text: string;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
}

// Queues per (lang, ctx): Map<"lang:ctx", QueueItem[]>
const queues = new Map<string, QueueItem[]>();

// Timers per (lang, ctx): Map<"lang:ctx", NodeJS.Timeout>
const timers = new Map<string, NodeJS.Timeout>();

/**
 * Get queue key
 */
function getQueueKey(lang: string, ctx: string): string {
  return `${lang}:${ctx}`;
}

/**
 * Enqueue a translation request
 */
export function enqueue(text: string, lang: string, ctx: string): Promise<string> {
  const key = getQueueKey(lang, ctx);

  return new Promise((resolve, reject) => {
    // Get or create queue
    if (!queues.has(key)) {
      queues.set(key, []);
    }

    const queue = queues.get(key)!;

    // Check if already in queue
    const existing = queue.find((item) => item.text === text);
    if (existing) {
      // Piggyback on existing request
      const originalResolve = existing.resolve;
      existing.resolve = (result: string) => {
        originalResolve(result);
        resolve(result);
      };
      return;
    }

    // Add to queue
    queue.push({ text, resolve, reject });

    const config = getConfig();

    // Check if we should flush immediately (batch size reached)
    if (queue.length >= config.batchSize) {
      clearTimeout(timers.get(key));
      timers.delete(key);
      flush(lang, ctx);
      return;
    }

    // Schedule flush if not already scheduled
    if (!timers.has(key)) {
      const timer = setTimeout(() => {
        timers.delete(key);
        flush(lang, ctx);
      }, config.batchDelay);
      timers.set(key, timer);
    }
  });
}

/**
 * Flush queue and process batch
 */
async function flush(lang: string, ctx: string): Promise<void> {
  const key = getQueueKey(lang, ctx);
  const queue = queues.get(key);

  if (!queue || queue.length === 0) {
    return;
  }

  // Remove queue
  queues.delete(key);

  // Get unique texts to translate
  const uniqueTexts = Array.from(new Set(queue.map((item) => item.text)));

  try {
    // Get examples from cache
    const config = getConfig();
    const allCached = await getAllCached(lang, ctx);
    const examples = selectExamples(allCached, config.maxExamples);

    // Call provider
    const provider = createProvider(config);
    const translations = await provider.translate(uniqueTexts, lang, examples);

    // Save to cache
    await setCachedBatch(translations, lang, ctx);

    // Resolve all promises
    for (const item of queue) {
      const translation = translations[item.text];
      if (translation) {
        item.resolve(translation);
      } else {
        item.reject(new Error(`No translation returned for: ${item.text}`));
      }
    }
  } catch (error: any) {
    // Reject all promises with the error
    for (const item of queue) {
      item.reject(error);
    }
  }
}

/**
 * Select examples from cache (simple: last N entries)
 */
function selectExamples(cache: Record<string, string>, maxExamples: number): Record<string, string> {
  const entries = Object.entries(cache);
  
  if (entries.length <= maxExamples) {
    return cache;
  }

  // Take last N entries (most recent)
  const selected = entries.slice(-maxExamples);
  return Object.fromEntries(selected);
}
