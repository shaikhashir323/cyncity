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
      model: 'gpt-3.5-turbo', // Use the Chat Completions model
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
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