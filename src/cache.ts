/**
 * Cache management for translations
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { getConfig } from './config.js';

// In-memory cache: Map<"localesDir:lang:ctx", Record<text, translation>>
const memCache = new Map<string, Record<string, string>>();

// File locks: Map<filePath, Promise<void>>
const locks = new Map<string, Promise<void>>();

/**
 * Get cache key for in-memory storage (includes localesDir for isolation)
 */
function getCacheKey(lang: string, ctx: string): string {
  const config = getConfig();
  return `${config.localesDir}:${lang}:${ctx}`;
}

/**
 * Get file path for cache
 */
function getCachePath(lang: string, ctx: string): string {
  const config = getConfig();
  return join(config.localesDir, lang, `${ctx}.json`);
}

/**
 * Load cache from file into memory (lazy loading)
 */
async function loadCache(lang: string, ctx: string): Promise<Record<string, string>> {
  const key = getCacheKey(lang, ctx);
  
  // Return if already loaded
  if (memCache.has(key)) {
    return memCache.get(key)!;
  }
  
  const filePath = getCachePath(lang, ctx);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    memCache.set(key, data);
    return data;
  } catch (error: any) {
    // File doesn't exist or invalid JSON - start with empty cache
    if (error.code === 'ENOENT') {
      const empty = {};
      memCache.set(key, empty);
      return empty;
    }
    throw new Error(`Failed to load cache from ${filePath}: ${error.message}`);
  }
}

/**
 * Save cache to file with atomic write
 */
async function saveCache(lang: string, ctx: string, data: Record<string, string>): Promise<void> {
  const filePath = getCachePath(lang, ctx);
  const tempPath = `${filePath}.tmp`;
  
  // Ensure directory exists
  await fs.mkdir(dirname(filePath), { recursive: true });
  
  // Write to temp file
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  
  // Atomic rename
  await fs.rename(tempPath, filePath);
}

/**
 * Execute function with file lock
 */
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Wait for existing lock
  while (locks.has(key)) {
    await locks.get(key);
  }
  
  // Create new lock
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  locks.set(key, promise);
  
  try {
    return await fn();
  } finally {
    locks.delete(key);
    resolve!();
  }
}

/**
 * Get cached translation
 */
export async function getCached(text: string, lang: string, ctx: string): Promise<string | null> {
  const cache = await loadCache(lang, ctx);
  return cache[text] || null;
}

/**
 * Set cached translation
 */
export async function setCached(text: string, translation: string, lang: string, ctx: string): Promise<void> {
  const key = getCacheKey(lang, ctx);
  const lockKey = getCachePath(lang, ctx);
  
  await withLock(lockKey, async () => {
    const cache = await loadCache(lang, ctx);
    cache[text] = translation;
    memCache.set(key, cache);
    await saveCache(lang, ctx, cache);
  });
}

/**
 * Set multiple cached translations at once
 */
export async function setCachedBatch(
  entries: Record<string, string>,
  lang: string,
  ctx: string
): Promise<void> {
  const key = getCacheKey(lang, ctx);
  const lockKey = getCachePath(lang, ctx);
  
  await withLock(lockKey, async () => {
    const cache = await loadCache(lang, ctx);
    Object.assign(cache, entries);
    memCache.set(key, cache);
    await saveCache(lang, ctx, cache);
  });
}

/**
 * Get all cached translations for a language/context
 */
export async function getAllCached(lang: string, ctx: string): Promise<Record<string, string>> {
  const cache = await loadCache(lang, ctx);
  return { ...cache };
}
