import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OpenAIService } from '../openai/openai.service';
import { PineconeService } from '../pinecone/pinecone.service';
import { LocationData } from '../types/location-data'; // Import the shared type
import { HealthData } from '../types/health-data'; // Import the shared type
import { Param } from '@nestjs/common';


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
        .filter(match => match.id.startsWith(`chat:${senderId}:`) && match.metadata?.text)
        .sort((a, b) => String(b.metadata.timestamp || '').localeCompare(String(a.metadata.timestamp || '')))
        .slice(0, 5);

      const conversationHistory = senderHistory
        .map(match => {
          const time = match.metadata.timestamp || 'Unknown time';
          const text = match.metadata.text;
          return `${time}: ${text}`;
        })
        .join('\n');

      // Fetch the latest health data
      const [healthData, locationData] = await Promise.all([
        this.pineconeService.getLatestHealthData(senderId),
        this.pineconeService.getLatestLocationData(senderId)
      ]);
      // Format health data for the prompt
      let healthDataString = '';
      if (healthData) {
        healthDataString = 'Latest Data for Giovanni:\n';
        for (const [key, value] of Object.entries(healthData)) {
          healthDataString += `- ${key}: ${value}\n`;
        }
      } else {
        healthDataString = 'No data available for Giovanni.';
      }
      // Format location data with null checks
      let locationString = '';
      if (locationData && locationData.latitude && locationData.longitude) {
        locationString = `Current Location: ${
          locationData.location || 
          `coordinates ${locationData.latitude}, ${locationData.longitude}`
        }\n`;
      } else {
        locationString = 'No location data available.\n';
      }

      // Relationship context
      const relationshipContext = `You are assisting Marta Rossi, who is the mother of Giovanni Rossi, the person with the device.`;

      // Define phrases where "Hi Marta" should NOT appear
      const skipGreetingPhrases = ['thank you', 'thanks', 'got it', 'okay', 'ok', 'bye', 'goodbye', 'appreciate it'];

      // Normalize user input for comparison
      const lowerUserQuery = userQuery.toLowerCase().trim();
      const isSimpleResponse = skipGreetingPhrases.includes(lowerUserQuery);

          // Check if query is about location
      const isLocationQuery = lowerUserQuery.includes('location') || 
      lowerUserQuery.includes('where') || 
      lowerUserQuery.includes('position');

  
      // Construct the prompt for OpenAI
      const fullPrompt = `
Relationship Context:
${relationshipContext}

Conversation History:
${conversationHistory || 'No prior conversation found.'}

Current Context:
${locationString}
${healthDataString}


Additional Context:
${healthDataString}

Instructions:
- You are an AI assistant named Al, helping family members of individuals with devices.
- **DO NOT** start responses with "Hi Marta" when responding to acknowledgments like "thank you", "ok", "bye", etc.
- Only use "Hi Marta" when answering direct questions or providing important updates.
- Be empathetic, concise, and proactive. For example:
  - If asked about location, respond like: "Giovanni is at [location]. Would you like me to update you if he moves?"
  - If asked about health, respond like: "At the moment, Giovanni’s vital parameters are normal: heart rate is [value] bpm, and oxygen saturation is [value]%. Would you like notifications if anything changes?"
  - If asked about issues or external actions (e.g., bus delays), respond like: "I understand the issue. I’ll report it to [relevant party] and keep you updated."
- If information is unavailable, say so politely and offer help (e.g., "There are no reports of any problems. Would you like me to check with him?").
- End responses with a friendly offer like: "It’s my pleasure to assist, Marta! Feel free to reach out if you need anything else."

${isLocationQuery ? 'The user is asking about location. ' + 
  (locationData ? 'Provide the available location information.' : 
   'Explain that location data is not currently available.') : ''}
- Maintain a caring, professional tone
- If information is unavailable, offer to help get updates
- Keep responses concise but helpful


Current Message:
User: ${userQuery}
AI:
      `;

      console.log('Full Prompt Sent to OpenAI:', fullPrompt);

      // Generate AI response
      let aiResponse = await this.openaiService.generateResponse(fullPrompt);
      
      // Remove "Hi Marta" if it's an acknowledgment
      if (isSimpleResponse && aiResponse.startsWith('Hi Marta')) {
          aiResponse = aiResponse.replace(/^Hi Marta,?\s*/, ''); // Remove only at the start
      }

      console.log('Final AI Response:', aiResponse);

      // Send response back via WhatsApp
      return this.whatsappService.sendMessage(senderId, 'ai_response', [aiResponse]);
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
@Post('store-location-data')
async storeLocationData(@Body() body: { userId: string; locationData: LocationData }) {
  const { userId, locationData } = body;
  await this.pineconeService.storeLocationData(userId, locationData);
  return { status: 'success', message: `Location data stored for user ${userId}` };
}

    
@Get('latest-location-data/:userId')
async getLatestLocationData(@Param('userId') userId: string) {
  const data = await this.pineconeService.getLatestLocationData(userId);
  return data ? { status: 'success', data } : { status: 'error', message: 'No data found' };
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