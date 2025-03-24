import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
  private readonly apiUrl: string;
  private readonly accessToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
  }

  async sendMessage(to: string, templateName: string, parameters: string[] = []) {
    console.log({ parameters });

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: parameters[0] || 'Default Value 1' }, // First parameter
              { type: 'text', text: parameters[1] || 'Default Value 2' }, // Second parameter
              { type: 'text', text: parameters[2] || 'Default Value 3' }, // Third parameter
              { type: 'text', text: parameters[3] || 'Default Value 4' }, // Fourth parameter
            ],
          },
        ],
      },
    };
    

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      console.log('Sent Payload:', JSON.stringify(payload, null, 2));
      console.log('WhatsApp API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
}