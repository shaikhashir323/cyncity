import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  async generateResponse(prompt: string): Promise<string> {
    const payload = {
      model: 'gpt-3.5-turbo', // Keep your existing model
      messages: [
        {
          role: 'system',
          content: 'You are a friendly chatbot with memory. Use the conversation history provided in the prompt to answer questions or infer details like the user’s name if mentioned earlier. If no relevant history is provided, respond naturally based on the current input.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7, // Optional: Adjust for creativity vs. precision
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.openai.com/v1/chat/completions', payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response:', error.response?.data || error.message);
      throw error;
    }
  }
}