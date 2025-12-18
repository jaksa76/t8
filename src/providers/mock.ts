/**
 * Mock provider for testing
 */

import { Provider } from './provider.js';

/**
 * Mock provider that returns predictable translations
 * Format: "[lang] original text"
 */
export class MockProvider implements Provider {
  async translate(
    texts: string[],
    lang: string,
    examples: Record<string, string>
  ): Promise<Record<string, string>> {
    // Return predictable translations for testing
    const result: Record<string, string> = {};
    
    for (const text of texts) {
      result[text] = `[${lang}] ${text}`;
    }
    
    return result;
  }
}
