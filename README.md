# t8

AI-powered internationalization library with context-aware translation and local caching.

## Features

- 🤖 **AI-Powered**: Uses LLMs (OpenAI, Gemini, OpenRouter) for natural translations
- 💾 **Local Caching**: Stores translations in user-editable JSON files
- 🎯 **Context-Aware**: Learns from previous translations for consistency
- 📦 **Transparent Batching**: Automatically batches requests to reduce token usage
- 🔧 **User-Fixable**: Edit translation cache files to fix any errors
- 🚀 **Simple API**: Single function `t8(text, lang, ctx)`

## Installation

```bash
npm install t8
```

## Quick Start

```javascript
import t8 from 't8';

// Configure (optional - can also use environment variables)
t8.configure({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini'
});

// Translate text
const greeting = await t8('Hello', 'fr');  // "Bonjour"
const button = await t8('Sign in', 'fr');  // "Se connecter"

// Use contexts for different translation styles
const marketing = await t8('Sign in', 'fr', 'marketing');
const legal = await t8('Sign in', 'fr', 'legal');
```

## Environment Variables

```bash
T8_PROVIDER=openai          # or gemini, openrouter
T8_API_KEY=your-api-key
T8_MODEL=gpt-4o-mini
T8_LOCALES_DIR=./locales
T8_EXAMPLES_MAX=50
T8_BATCH_MAX=25
T8_DEBOUNCE_MS=20
```

## Cache Structure

Translations are stored in JSON files:

```
locales/
  fr/
    default.json
    marketing.json
  de/
    default.json
```

Each file is a simple key-value map:

```json
{
  "Hello": "Bonjour",
  "Sign in": "Se connecter"
}
```

## API

### `t8(text, lang, ctx?)`

Translate text to target language.

- `text`: Source text to translate
- `lang`: Target language code (e.g., 'fr', 'de', 'es')
- `ctx`: Optional context namespace (default: "default")

### `t8.configure(config)`

Configure the library.

```typescript
t8.configure({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'your-api-key',
  localesDir: './locales',
  examples: { maxPairs: 50 },
  batch: { maxSize: 25, debounceMs: 20 }
});
```

### `t8.for(lang, ctx?)`

Create a bound translator for a specific language.

```javascript
const t = t8.for('fr', 'default');
await t('Hello');  // "Bonjour"
```

## How It Works

1. **Cache First**: Checks local JSON cache for existing translation
2. **Context-Aware**: If missing, sends cached translations as examples to LLM
3. **Smart Batching**: Automatically batches multiple requests together
4. **Atomic Updates**: Safely writes cache files even with concurrent requests

## License

MIT
