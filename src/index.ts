/**
 * t8 - AI-powered internationalization library
 * 
 * Main API:
 *   t8(text, lang, ctx="default") - Translate text to target language
 *   t8.configure(options) - Configure the library
 */

import { configure as configureInternal, T8Config } from './config.js';
import { getCached } from './cache.js';
import { enqueue } from './batch.js';

/**
 * Translate text to target language with optional context
 * 
 * @param text - Source text to translate
 * @param lang - Target language code (e.g., 'fr', 'de', 'es')
 * @param ctx - Context namespace for separate translation caches (default: "default")
 * @returns Promise resolving to translated text
 */
export async function t8(
  text: string,
  lang: string,
  ctx: string = 'default'
): Promise<string> {
  // Check cache first
  const cached = await getCached(text, lang, ctx);
  if (cached !== null) {
    return cached;
  }

  // Enqueue for batching
  return enqueue(text, lang, ctx);
}

/**
 * Configure t8 library settings
 * 
 * @param config - Configuration options
 */
t8.configure = function(config: Partial<T8Config>): void {
  configureInternal(config);
};

/**
 * Create a bound translator for a specific language and context
 * 
 * @param lang - Target language code
 * @param ctx - Context namespace (default: "default")
 * @returns Translator function
 */
t8.for = function(lang: string, ctx: string = 'default') {
  return (text: string) => t8(text, lang, ctx);
};

// Export types
export type { T8Config } from './config.js';

export default t8;
