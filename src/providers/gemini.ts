/**
 * Google Gemini provider implementation
 */

import { Provider } from './provider.js';

/**
 * Gemini provider using Google Generative AI API
 */
export class GeminiProvider implements Provider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async translate(
    texts: string[],
    lang: string,
    examples: Record<string, string>
  ): Promise<Record<string, string>> {
    const prompt = this.buildPrompt(texts, lang, examples);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json() as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No response from Gemini');
    }

    return this.parseResponse(content);
  }

  private buildPrompt(texts: string[], lang: string, examples: Record<string, string>): string {
    let prompt = `You are a professional translator. Translate UI strings to ${lang}.\n\n`;
    prompt += 'RULES:\n';
    prompt += '- Preserve placeholders like {name}, {{count}}, %s, %d\n';
    prompt += '- Keep HTML tags unchanged\n';
    prompt += '- Maintain leading/trailing whitespace\n';
    prompt += '- Keep the same tone and style\n';
    prompt += '- Return ONLY a JSON object mapping each input string to its translation\n\n';

    // Add examples for context
    const exampleEntries = Object.entries(examples);
    if (exampleEntries.length > 0) {
      prompt += 'EXAMPLES (for consistency):\n';
      const limitedExamples = exampleEntries.slice(0, 20);
      for (const [src, trans] of limitedExamples) {
        prompt += `"${src}" → "${trans}"\n`;
      }
      prompt += '\n';
    }

    prompt += 'TRANSLATE:\n';
    prompt += JSON.stringify(texts);
    prompt += '\n\nReturn only the JSON object, no additional text.';

    return prompt;
  }

  private parseResponse(content: string): Record<string, string> {
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error: any) {
      throw new Error(`Failed to parse Gemini response: ${error.message}`);
    }
  }
}
