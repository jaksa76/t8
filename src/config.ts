/**
 * Configuration management for t8
 */

export interface T8Config {
  provider: 'openai' | 'gemini' | 'openrouter' | 'mock';
  apiKey: string;
  model: string;
  localesDir: string;
  maxExamples: number;
  batchSize: number;
  batchDelay: number;
}

// Default configuration
const defaults: T8Config = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  localesDir: './locales',
  maxExamples: 50,
  batchSize: 25,
  batchDelay: 20,
};

// Load configuration from environment variables
function loadFromEnv(): T8Config {
  return {
    provider: (process.env.T8_PROVIDER as T8Config['provider']) || defaults.provider,
    apiKey: process.env.T8_API_KEY || defaults.apiKey,
    model: process.env.T8_MODEL || defaults.model,
    localesDir: process.env.T8_LOCALES_DIR || defaults.localesDir,
    maxExamples: process.env.T8_MAX_EXAMPLES ? parseInt(process.env.T8_MAX_EXAMPLES, 10) : defaults.maxExamples,
    batchSize: process.env.T8_BATCH_SIZE ? parseInt(process.env.T8_BATCH_SIZE, 10) : defaults.batchSize,
    batchDelay: process.env.T8_BATCH_DELAY ? parseInt(process.env.T8_BATCH_DELAY, 10) : defaults.batchDelay,
  };
}

// Current configuration
let config: T8Config = loadFromEnv();

/**
 * Update configuration with partial values
 */
export function configure(partial: Partial<T8Config>): void {
  config = { ...config, ...partial };
}

/**
 * Get current configuration
 */
export function getConfig(): T8Config {
  return { ...config };
}
