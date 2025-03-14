import { Controller, Post, Body } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OpenAIService } from '../openai/openai.service';

@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly openaiService: OpenAIService,
  ) {}

  @Post('send-message')
  async sendMessage(
    @Body('to') to: string,
    @Body('templateName') templateName: string,
  ) {
    return this.whatsappService.sendMessage(to, templateName);
  }

  @Post('generate-and-send')
  async generateAndSendResponse(
    @Body('to') to: string,
    @Body('query') query: string,
  ) {
    const aiResponse = await this.openaiService.generateResponse(
      `Provide a helpful response to this inquiry about services, events, or resources: ${query}`,
    );
    console.log('AI Generated Response:', aiResponse);
    // Send 2 parameters: AI response for {{1}}, default text for {{2}}
    return this.whatsappService.sendMessage(to, 'generic_response', [aiResponse, 'No additional info']);
  }

  @Post('generate-response')
  async generateResponse(@Body('prompt') prompt: string) {
    return this.openaiService.generateResponse(prompt);
  }
}