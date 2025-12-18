/**
 * Provider interface and factory
 */

import { T8Config } from '../config.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { OpenRouterProvider } from './openrouter.js';
import { MockProvider } from './mock.js';

/**
 * Provider interface for translation services
 */
export interface Provider {
  translate(
    texts: string[],
    lang: string,
    examples: Record<string, string>
  ): Promise<Record<string, string>>;
}

/**
 * Create provider instance based on configuration
 */
export function createProvider(config: T8Config): Provider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model);
    case 'openrouter':
      return new OpenRouterProvider(config.apiKey, config.model);
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
