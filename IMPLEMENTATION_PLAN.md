# t8 Implementation Plan (Simple)

## Architecture Overview

Keep it minimal - 8 files total:

```
src/
  index.ts                    # Public API: t8() function + configure()
  config.ts                   # Config management + env vars
  cache.ts                    # Cache read/write with atomic operations
  batch.ts                    # Request batching queue
  providers/
    provider.ts               # Provider interface + factory
    openai.ts                 # OpenAI implementation
    gemini.ts                 # Gemini implementation
    openrouter.ts             # OpenRouter implementation
    mock.ts                   # Mock provider for testing
```

---

## Core Components

### 1. **config.ts** - Configuration (~50 lines)

```typescript
interface T8Config {
  provider: 'openai' | 'gemini' | 'openrouter' | 'mock';
  apiKey: string;
  model: string;
  localesDir: string;
  maxExamples: number;
  batchSize: number;
  batchDelay: number;
}

let config: T8Config = loadFromEnv();

export function configure(partial: Partial<T8Config>): void
export function getConfig(): T8Config
```

**What it does:**
- Loads from env vars (`T8_PROVIDER`, `T8_API_KEY`, `T8_MODEL`, etc.)
- Allows runtime override via `configure()`
- Provides defaults (provider: 'openai', model: 'gpt-4o-mini', etc.)

---

### 2. **cache.ts** - File cache operations (~100 lines)

```typescript
// In-memory cache
const memCache = new Map<string, Record<string, string>>();

// File locks (simple promise queue)
const locks = new Map<string, Promise<void>>();

export async function getCached(text: string, lang: string, ctx: string): Promise<string | null>
export async function setCached(text: string, translation: string, lang: string, ctx: string): Promise<void>
export async function getAllCached(lang: string, ctx: string): Promise<Record<string, string>>

function getCachePath(lang: string, ctx: string): string // -> "locales/fr/default.json"
async function loadCache(path: string): Promise<Record<string, string>>
async function saveCache(path: string, data: Record<string, string>): Promise<void>
```

**What it does:**
- Lazy-loads JSON files into memory on first access
- Atomic writes (write to `.tmp`, then rename)
- Simple in-process locking per file
- Auto-creates directories

---

### 3. **providers/provider.ts** - Provider interface + factory (~40 lines)

```typescript
export interface Provider {
  translate(
    texts: string[],
    lang: string,
    examples: Record<string, string>
  ): Promise<Record<string, string>>;
}

export function createProvider(config: T8Config): Provider
```

**What it does:**
- Defines provider interface
- Factory function creates appropriate provider based on config
- Returns OpenAI/Gemini/OpenRouter/Mock instance

---

### 4. **providers/openai.ts** - OpenAI implementation (~70 lines)

```typescript
export class OpenAIProvider implements Provider {
  async translate(texts, lang, examples): Promise<Record<string, string>>
}
```

**What it does:**
- Calls OpenAI Chat Completions API
- Builds prompt with translation rules + examples
- Returns JSON: `{ "Hello": "Bonjour", ... }`

**Prompt structure:**
```
System: You translate UI strings to {lang}. Return only JSON.
User: 
  Rules: preserve {placeholders}, keep HTML tags
  Examples: { "Sign in": "Se connecter", ... }
  Translate: ["Hello", "Goodbye"]
```

---

### 5. **providers/gemini.ts** - Gemini implementation (~70 lines)

```typescript
export class GeminiProvider implements Provider {
  async translate(texts, lang, examples): Promise<Record<string, string>>
}
```

**What it does:**
- Calls Google Gemini API
- Similar prompt structure to OpenAI
- Handles Gemini-specific response format

---

### 6. **providers/openrouter.ts** - OpenRouter implementation (~70 lines)

```typescript
export class OpenRouterProvider implements Provider {
  async translate(texts, lang, examples): Promise<Record<string, string>>
}
```

**What it does:**
- Calls OpenRouter API (OpenAI-compatible)
- Adds OpenRouter-specific headers
- Uses configured model (e.g., 'anthropic/claude-3.5-sonnet')

---

### 7. **providers/mock.ts** - Mock for testing (~30 lines)

```typescript
export class MockProvider implements Provider {
  async translate(texts, lang, examples): Promise<Record<string, string>> {
    // Returns predictable translations for testing
    return Object.fromEntries(
      texts.map(text => [text, `[${lang}] ${text}`])
    );
  }
}
```

**What it does:**
- No API calls
- Returns predictable format: `"Hello"` → `"[fr] Hello"`
- Perfect for tests without API keys
- Can be enhanced to simulate delays, errors, etc.

---

### 8. **batch.ts** - Request batching (~80 lines)

```typescript
interface QueueItem {
  text: string;
  resolve: (result: string) => void;
  reject: (err: Error) => void;
}

const queues = new Map<string, QueueItem[]>();
const timers = new Map<string, NodeJS.Timeout>();

export function enqueue(text: string, lang: string, ctx: string): Promise<string>

async function flush(lang: string, ctx: string): Promise<void>
```

**What it does:**
- Queues requests per (lang, ctx)
- Flushes after delay OR when batch is full
- Deduplicates identical texts
- Calls provider, updates cache, resolves promises

**Flow:**
```
t8("Hello", "fr") -> enqueue -> wait 20ms -> flush batch
t8("Goodbye", "fr") -> enqueue (same batch)
                       
After 20ms: translate(["Hello", "Goodbye"], "fr", examples)
            -> save to cache -> resolve both promises
```

---

### 9. **index.ts** - Public API (~60 lines)

```typescript
export async function t8(text: string, lang: string, ctx = 'default'): Promise<string> {
  // Check cache
  const cached = await getCached(text, lang, ctx);
  if (cached) return cached;
  
  // Enqueue for batching
  return enqueue(text, lang, ctx);
}

t8.configure = configure;

t8.for = (lang: string, ctx = 'default') => {
  return (text: string) => t8(text, lang, ctx);
};

export default t8;
```

**What it does:**
- Checks cache first (fast path)
- Falls back to batch queue
- Exposes configuration
- Provides bound translator helper

---

## Implementation Order

1. **config.ts** - Simple, no dependencies
2. **cache.ts** - Depends on config
3. **providers/provider.ts** - Interface + factory
4. **providers/mock.ts** - For testing (no API needed)
5. **providers/openai.ts** - Main provider
6. **providers/gemini.ts** - Alternative provider
7. **providers/openrouter.ts** - Alternative provider
8. **batch.ts** - Depends on cache + provider
9. **index.ts** - Ties everything together

Total: ~520 lines of actual code (excluding types/comments)

---

## Testing Strategy

### Test Structure

```
test/
  unit/
    config.test.ts          # Config loading & merging
    cache.test.ts           # Cache operations (uses temp dir)
  integration/
    t8.test.ts             # Full flow with mock provider
    batching.test.ts       # Batching behavior & timing
    concurrent.test.ts     # Multiple simultaneous calls
  e2e/
    openai.test.ts         # Real OpenAI calls (optional, needs key)
    gemini.test.ts         # Real Gemini calls (optional, needs key)
    openrouter.test.ts     # Real OpenRouter calls (optional, needs key)
```

### Unit Tests

**config.test.ts** (~50 lines)
- Load defaults
- Override with env vars
- Override with configure()
- Merge partial configs

**cache.test.ts** (~100 lines)
- Read non-existent file (returns null)
- Write and read back
- Atomic writes (no corruption)
- Directory creation
- Concurrent writes to same file (locking)
- Multiple contexts (separate files)
- Invalid JSON handling

### Integration Tests

**t8.test.ts** (~100 lines)
```typescript
// Use mock provider for predictable results
test('basic translation', async () => {
  t8.configure({ provider: 'mock' });
  const result = await t8('Hello', 'fr');
  expect(result).toBe('[fr] Hello');
});

test('uses cache on second call', async () => {
  t8.configure({ provider: 'mock' });
  await t8('Hello', 'fr');  // First call
  const result = await t8('Hello', 'fr');  // From cache
  expect(result).toBe('[fr] Hello');
});

test('different contexts', async () => {
  t8.configure({ provider: 'mock' });
  const def = await t8('Hello', 'fr', 'default');
  const mkt = await t8('Hello', 'fr', 'marketing');
  // Both work independently
});
```

**batching.test.ts** (~80 lines)
```typescript
test('batches multiple calls', async () => {
  t8.configure({ provider: 'mock', batchDelay: 10 });
  
  const spy = jest.spyOn(provider, 'translate');
  
  const [r1, r2, r3] = await Promise.all([
    t8('Hello', 'fr'),
    t8('Goodbye', 'fr'),
    t8('Welcome', 'fr')
  ]);
  
  // Only 1 provider call for all 3
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(
    ['Hello', 'Goodbye', 'Welcome'],
    'fr',
    expect.any(Object)
  );
});

test('separate batches for different languages', async () => {
  // fr and de should be separate batches
});

test('flushes when batch size reached', async () => {
  t8.configure({ batchSize: 2 });
  // 3 calls should trigger 2 batches
});
```

**concurrent.test.ts** (~60 lines)
```typescript
test('handles concurrent calls safely', async () => {
  t8.configure({ provider: 'mock' });
  
  // Hammer it with 100 concurrent calls
  const promises = Array.from({ length: 100 }, (_, i) => 
    t8(`Text ${i}`, 'fr')
  );
  
  const results = await Promise.all(promises);
  
  // All should complete successfully
  expect(results).toHaveLength(100);
  
  // Cache should have all entries
  const cache = await getAllCached('fr', 'default');
  expect(Object.keys(cache)).toHaveLength(100);
});
```

### E2E Tests (Optional)

**openai.test.ts** (~30 lines)
```typescript
// Only run if T8_OPENAI_KEY env var is set
test.skipIf(!process.env.T8_OPENAI_KEY)('real OpenAI translation', async () => {
  t8.configure({ 
    provider: 'openai',
    apiKey: process.env.T8_OPENAI_KEY 
  });
  
  const result = await t8('Hello', 'fr');
  expect(result).not.toBe('Hello');
  expect(result.toLowerCase()).toContain('bonjour');
});
```

**gemini.test.ts** (~30 lines)
```typescript
// Only run if T8_GEMINI_KEY env var is set
test.skipIf(!process.env.T8_GEMINI_KEY)('real Gemini translation', async () => {
  t8.configure({ 
    provider: 'gemini',
    apiKey: process.env.T8_GEMINI_KEY 
  });
  
  const result = await t8('Hello', 'de');
  expect(result).not.toBe('Hello');
  expect(result.toLowerCase()).toContain('hallo');
});
```

**openrouter.test.ts** (~30 lines)
```typescript
// Only run if T8_OPENROUTER_KEY env var is set
test.skipIf(!process.env.T8_OPENROUTER_KEY)('real OpenRouter translation', async () => {
  t8.configure({ 
    provider: 'openrouter',
    apiKey: process.env.T8_OPENROUTER_KEY,
    model: 'anthropic/claude-3.5-sonnet'
  });
  
  const result = await t8('Hello', 'es');
  expect(result).not.toBe('Hello');
  expect(result.toLowerCase()).toContain('hola');
});
```

### Test Utilities

**test/helpers.ts** (~50 lines)
```typescript
// Clean up test cache files
export async function cleanTestCache(): Promise<void>

// Create temp directory for tests
export function getTempLocalesDir(): string

// Mock fetch for provider tests
export function mockFetch(response: any): void

// Wait for batching delay
export function waitForBatch(ms = 50): Promise<void>
```

### Running Tests

```json
// package.json
{
  "scripts": {
    "test": "node --test test/**/*.test.ts",
    "test:unit": "node --test test/unit/**/*.test.ts",
    "test:integration": "node --test test/integration/**/*.test.ts",
    "test:watch": "node --test --watch test/**/*.test.ts"
  }
}
```

### Coverage Goals

- **Unit tests**: 90%+ coverage of config & cache
- **Integration tests**: Cover all user-facing flows with mock provider
- **E2E tests**: Optional per-provider validation before releases

### Key Testing Principles

1. **Use mock provider by default** - Fast, no API keys needed
2. **No unit tests for providers** - Thin integration layer, covered by e2e
3. **Test isolation** - Each test uses its own temp cache directory
4. **Clean up** - Remove test files after each test
5. **Timing tests** - Use longer delays to avoid flakiness
6. **Real API optional** - E2E tests skip if no API key present

This strategy ensures:
- ✅ Fast test suite (mock provider)
- ✅ No API keys required for development
- ✅ High confidence in core functionality
- ✅ Easy to run in CI/CD
- ✅ Real provider testing only when needed

---

## Key Design Choices

1. **Simple provider abstraction** - Interface + factory, nothing fancy
2. **Mock provider for tests** - No API keys needed for development
3. **Multiple providers from start** - OpenAI, Gemini, OpenRouter
4. **Simple example selection** - Just send last N translations (no scoring algorithm)
5. **No placeholder validation** - Trust the LLM (add later if issues arise)
6. **Flat structure** - All files in `src/`, no subdirectories

## What We're NOT Building (Yet)

- Smart example selection with scoring
- Placeholder validation
- Retry logic
- Request rate limiting
- Detailed logging
- CLI tool

Can add these later if needed. Start simple, iterate based on real usage.

---

## Example Usage

```javascript
import t8 from 't8';

// Configure with OpenAI
t8.configure({ 
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini'
});

// Or use Gemini
t8.configure({ 
  provider: 'gemini',
  apiKey: 'your-gemini-key',
  model: 'gemini-1.5-flash'
});

// Or use mock for testing
t8.configure({ provider: 'mock' });

// Use
const greeting = await t8("Hello", "fr");           // -> "Bonjour"
const farewell = await t8("Goodbye", "fr");         // -> "Au revoir"

// Both batched into single API call if within 20ms

// Context
await t8("Sign in", "fr", "marketing");  // Different cache file
```

## Cache Format

```
locales/
  fr/
    default.json       -> { "Hello": "Bonjour", "Goodbye": "Au revoir" }
    marketing.json     -> { "Sign in": "Inscrivez-vous maintenant!" }
  de/
    default.json
```

User can edit these files directly to fix translations.
