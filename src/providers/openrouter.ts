/**
 * OpenRouter provider implementation
 */

import { Provider } from './provider.js';

/**
 * OpenRouter provider using OpenAI-compatible API
 */
export class OpenRouterProvider implements Provider {
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/t8-lib/t8',
        'X-Title': 't8 Translation Library',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate UI strings to ${lang}. Return ONLY valid JSON with no additional text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    return this.parseResponse(content);
  }

  private buildPrompt(texts: string[], lang: string, examples: Record<string, string>): string {
    let prompt = 'Translate the following UI strings to ' + lang + '.\n\n';
    prompt += 'RULES:\n';
    prompt += '- Preserve placeholders like {name}, {{count}}, %s, %d\n';
    prompt += '- Keep HTML tags unchanged\n';
    prompt += '- Maintain leading/trailing whitespace\n';
    prompt += '- Keep the same tone and style\n';
    prompt += '- Return a JSON object mapping each input string to its translation\n\n';

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

    return prompt;
  }

  private parseResponse(content: string): Record<string, string> {
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      let jsonStr = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (error: any) {
      throw new Error(`Failed to parse OpenRouter response: ${error.message}\nContent: ${content}`);
    }
  }
}
