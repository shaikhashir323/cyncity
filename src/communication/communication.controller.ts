import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OpenAIService } from '../openai/openai.service';
import { PineconeService } from '../pinecone/pinecone.service';
import { HealthData } from '../types/health-data'; // Import the shared type

const VERIFY_TOKEN = 'my_secure_token';

@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly openaiService: OpenAIService,
    private readonly pineconeService: PineconeService,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return challenge;
    } else {
      console.error('Webhook verification failed.');
      return 'Verification failed';
    }
  }

  @Post('webhook')
  async handleIncomingMessages(@Body() body: any) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
  
    if (message) {
      const senderId = message.from.trim();
      const userQuery = typeof message.text?.body === 'string' ? message.text.body.trim() : '';
  
      if (userQuery) {
        console.log(`User ${senderId} asked: ${userQuery}`);
        const timestamp = new Date().toISOString();
        const vectorId = `chat:${senderId}:${timestamp}`;
        await this.pineconeService.storeVector(vectorId, userQuery);
  
        // Retrieve conversation history
        let chatHistory = await this.pineconeService.querySimilarVectors(userQuery);
        if (!chatHistory.some(match => match.id.startsWith(`chat:${senderId}:`))) {
          chatHistory = await this.pineconeService.querySimilarVectors(`chat:${senderId}`, 20);
        }
  
        const senderHistory = chatHistory
          .filter(match => match.id.startsWith(`chat:${senderId}:`) && match.metadata && match.metadata.text)
          .sort((a, b) => String(b.metadata.timestamp || '').localeCompare(String(a.metadata.timestamp || '')))
          .slice(0, 5);
          
  
        const conversationHistory = senderHistory
          .map(match => {
            const time = match.metadata.timestamp || 'Unknown time';
            const text = match.metadata.text;
            return `${time}: ${text}`;
          })
          .join('\n');
  
        // Fetch the latest health data from Pinecone
        const healthData = await this.pineconeService.getLatestHealthData(senderId);
  
        // Format health data dynamically
        let healthDataString = '';
        if (healthData) {
          healthDataString = 'User\'s Latest Health Data:\n';
          for (const [key, value] of Object.entries(healthData)) {
            healthDataString += `- ${key}: ${value}\n`;
          }
        } else {
          healthDataString = 'No health data available for the user.';
        }
  
        // Construct the prompt with health data and instructions
        const fullPrompt = `
  Conversation History:
  ${conversationHistory || 'No prior conversation found.'}
  
  Additional Context:
  ${healthDataString}
  
  Instructions:
  - Use the conversation history to maintain context.
  - Use the health data only if the user asks about their health or if it’s relevant to their query.
  - If the user asks about a specific health metric not listed, inform them that the information is not available.
  
  Current Message:
  User: ${userQuery}
  AI:
        `;
        console.log('Full Prompt Sent to OpenAI:', fullPrompt);
  
        // Generate AI response
        const aiResponse = await this.openaiService.generateResponse(fullPrompt);
        console.log('AI Response:', aiResponse);
  
        // Send response back via WhatsApp
        return this.whatsappService.sendMessage(senderId, 'card_transaction_alert_2 ', [aiResponse, '']);

      }
    }
  
    return { status: 'received' };
  }

  @Post('store-health-data')
  async storeHealthData(@Body() body: { userId: string; healthData: HealthData }) {
    const { userId, healthData } = body;
    await this.pineconeService.storeHealthData(userId, healthData);
    return { status: 'success', message: `Health data stored for user ${userId}` };
  }

  @Get('get-health-data')
  async getHealthData(@Query('userId') userId: string) {
    const healthData = await this.pineconeService.getLatestHealthData(userId);
    if (healthData) {
      return { status: 'success', data: healthData };
    }
    return { status: 'not_found', message: `No health data found for user ${userId}` };
  }

  @Post('generate-response')
  async generateResponse(@Body('prompt') prompt: string) {
    return this.openaiService.generateResponse(prompt);
  }

  @Post('generate-embedding')
  async generateEmbedding(@Body('text') text: string) {
    return this.pineconeService.generateEmbedding(text);
  }

  @Post('store-vector')
  async storeVector(@Body() body: { id: string; text: string }) {
    return this.pineconeService.storeVector(body.id, body.text);
  }

  @Post('query-vectors')
  async queryVectors(@Body('queryText') queryText: string) {
    return this.pineconeService.querySimilarVectors(queryText);
  }
}