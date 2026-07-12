import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiClient {
  generateChatResponse(messages: ChatMessage[]): Promise<string>;
}

export class OpenAiClient implements AiClient {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: OPENAI_API_KEY is not defined in env.');
    }
    this.client = new OpenAI({ apiKey: apiKey || 'dummy-key' });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async generateChatResponse(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.choices[0].message.content || '';
  }
}

// In the future we can add other providers, e.g. DeepSeekClient, GeminiClient
export function getAiClient(): AiClient {
  const provider = process.env.AI_PROVIDER || 'openai';

  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAiClient();
    default:
      console.warn(
        `Unknown AI provider "${provider}". Defaulting to OpenAI client.`
      );
      return new OpenAiClient();
  }
}
