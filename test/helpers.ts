/**
 * Test helpers and utilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Create a temporary directory for tests
 */
export function getTempLocalesDir(): string {
  return join(tmpdir(), `t8-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
}

/**
 * Clean up test cache directory
 */
export async function cleanTestCache(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Wait for a specified duration (for batching tests)
 */
export function waitForBatch(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read a cache file directly
 */
export async function readCacheFile(localesDir: string, lang: string, ctx: string): Promise<Record<string, string> | null> {
  try {
    const filePath = join(localesDir, lang, `${ctx}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Write a cache file directly
 */
export async function writeCacheFile(
  localesDir: string,
  lang: string,
  ctx: string,
  data: Record<string, string>
): Promise<void> {
  const dir = join(localesDir, lang);
  await fs.mkdir(dir, { recursive: true });
  const filePath = join(dir, `${ctx}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Clear in-memory cache (for testing)
 * This is a workaround to access the internal cache state
 */
export async function clearMemoryCache(): Promise<void> {
  // Force a new module import to reset state
  const cachePath = new URL('../../src/cache.js', import.meta.url).href;
  if (cachePath in (await import('module')).cache) {
    delete (await import('module')).cache[cachePath];
  }
}
