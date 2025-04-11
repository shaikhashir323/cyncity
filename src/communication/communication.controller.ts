import { Controller, Post, Get, Query, Body, Param } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { OpenAIService } from '../openai/openai.service';
import { PineconeService } from '../pinecone/pinecone.service';
import { WatchService } from '../watches/watch.service';
import { UserService } from '../user/user.service';
import { Watch } from '../watches/watch.entity';
import { LocationData } from '../types/location-data';
import { HealthData } from '../types/health-data';

const VERIFY_TOKEN = 'my_secure_token';

@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly openaiService: OpenAIService,
    private readonly pineconeService: PineconeService,
    private readonly watchService: WatchService,
    private readonly userService: UserService,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
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
    console.log(message, "message");
  
    if (message) {
      const senderId = message.from.trim(); // Caregiver's phone number
      const userQuery = typeof message.text?.body === 'string' ? message.text.body.trim() : '';
  
      if (userQuery) {
        console.log(`Sender ${senderId} asked: ${userQuery}`);
  
        // Find all watches where senderId is a caregiver
        const allWatches = await this.watchService.findAll();
        const associatedPatients = allWatches.filter(watch => 
          watch.caregiverPhoneNumbers?.includes(senderId)
        );
  
        if (!associatedPatients.length) {
          return this.whatsappService.sendMessage(
            senderId,
            'text',
            ['You are not linked to any patients as a caregiver. Please contact support to associate patients.']
          );
        }
  
        const latestVector = await this.pineconeService.querySimilarVectors(`chat:${senderId}`, 1);
        let selectedPatientId = latestVector[0]?.metadata?.selectedPatientId;
        let selectedPatient: Watch | undefined;
  
        const queryLower = userQuery.toLowerCase();
  
        // Look for patient name in the query (e.g., "Ali ka health")
        selectedPatient = associatedPatients.find(p => queryLower.includes(p.name.toLowerCase()));
        if (selectedPatient) {
          selectedPatientId = selectedPatient.id;
        } else {
          // Check for explicit switch commands (e.g., "select Ali" or "switch to patient 2")
          if (queryLower.startsWith('select ') || queryLower.startsWith('switch to ')) {
            const patientIdentifier = queryLower.replace('select ', '').replace('switch to ', '').trim();
            selectedPatient = associatedPatients.find(p => p.name.toLowerCase() === patientIdentifier);
            if (!selectedPatient) {
              const match = patientIdentifier.match(/patient (\d+)/);
              if (match) {
                const patientIndex = parseInt(match[1], 10) - 1;
                selectedPatient = associatedPatients[patientIndex];
              }
            }
            if (selectedPatient) {
              selectedPatientId = selectedPatient.id;
            } else {
              return this.whatsappService.sendMessage(
                senderId,
                'text',
                ['Patient not found. Please use a valid name or number from: ' + this.buildPatientSelectionMessage(associatedPatients)]
              );
            }
          }
        }
  
        if (!selectedPatientId) {
          const patientListMessage = this.buildPatientSelectionMessage(associatedPatients);
          return this.whatsappService.sendMessage(senderId, 'text', [patientListMessage]);
        }
  
        if (/^\d+$/.test(userQuery)) {
          const patientIndex = parseInt(userQuery, 10) - 1;
          if (patientIndex >= 0 && patientIndex < associatedPatients.length) {
            selectedPatient = associatedPatients[patientIndex];
            selectedPatientId = selectedPatient.id;
          }
        }
  
        selectedPatient = associatedPatients.find(p => p.id === selectedPatientId);
        if (!selectedPatient) {
          return this.whatsappService.sendMessage(
            senderId,
            'text',
            ['Error: Selected patient not found. Please try again.']
          );
        }
  
        const vectorId = `chat:${senderId}:${new Date().toISOString()}`;
        await this.pineconeService.storeVector(vectorId, userQuery, {
          selectedPatientId: selectedPatient.id,
          selectedPatientName: selectedPatient.name,
          selectedPatientPhone: selectedPatient.phoneNumber,
        });
  
        const [healthData, locationData] = await Promise.all([
          this.pineconeService.getLatestHealthData(selectedPatient.id),
          this.pineconeService.getLatestLocationData(selectedPatient.id),
        ]);
  
        const healthDataString = this.formatHealthData(selectedPatient.name, healthData);
        const locationString = this.formatLocationData(locationData);
        const relationshipContext = `You are assisting ${senderId}, a caregiver of ${selectedPatient.name}, the patient with the device.`;
  
        const chatHistory = await this.pineconeService.querySimilarVectors(`chat:${senderId}`, 20);
        const senderHistory = chatHistory
          .filter(match => match.id.startsWith(`chat:${senderId}:`) && match.metadata?.text)
          .sort((a, b) => String(b.metadata.timestamp || '').localeCompare(String(a.metadata.timestamp || '')))
          .slice(0, 5);
  
        const conversationHistory = senderHistory
          .map(match => `${match.metadata.timestamp || 'Unknown time'}: ${match.metadata.text}`)
          .join('\n');
  
        const fullPrompt = this.buildPrompt(
          relationshipContext,
          conversationHistory,
          locationString,
          healthDataString,
          userQuery,
          selectedPatient.name,
        );
  
        let aiResponse = await this.openaiService.generateResponse(fullPrompt);
        aiResponse = this.adjustResponse(userQuery, aiResponse);
  
        console.log('Final AI Response:', aiResponse);
        return this.whatsappService.sendMessage(senderId, 'text', [aiResponse]);
      }
    }
  
    return { status: 'received' };
  }

  private buildPatientSelectionMessage(patients: Watch[]): string {
    let message = 'Please select a patient by typing the corresponding number:\n';
    patients.forEach((patient, index) => {
      message += `${index + 1}. ${patient.name} (${patient.brand})\n`;
    });
    return message;
  }

  private formatHealthData(name: string, healthData: HealthData | null): string {
    if (healthData) {
      let result = `Latest Data for ${name}:\n`;
      for (const [key, value] of Object.entries(healthData)) {
        result += `- ${key}: ${value}\n`;
      }
      return result;
    }
    return `No data available for ${name}.`;
  }

  private formatLocationData(locationData: LocationData | null): string {
    if (locationData && locationData.latitude && locationData.longitude) {
      return `Current Location: ${
        locationData.location || `coordinates ${locationData.latitude}, ${locationData.longitude}`
      }\n`;
    }
    return 'No location data available.\n';
  }

  private buildPrompt(
    relationshipContext: string,
    conversationHistory: string,
    locationString: string,
    healthDataString: string,
    userQuery: string,
    patientName: string,
  ): string {
    const isLocationQuery =
      userQuery.toLowerCase().includes('location') ||
      userQuery.toLowerCase().includes('where') ||
      userQuery.toLowerCase().includes('position');

    return `
Relationship Context:
${relationshipContext}

Conversation History:
${conversationHistory || 'No prior conversation found.'}

Current Context:
${locationString}
${healthDataString}

Instructions:
- You are an AI assistant named Al, helping caregivers of patients with devices.
- Be empathetic, concise, and proactive.
- Refer to the patient as "${patientName}".
- If asked about location, provide the available location information or explain it’s unavailable.
- If asked about health, provide the latest health data or note if it’s unavailable.
- If information is unavailable, offer help politely (e.g., "I don’t have that information right now. Would you like me to check further?").
- End responses with a friendly offer like: "It’s my pleasure to assist! Feel free to reach out if you need anything else."

${isLocationQuery ? 'The user is asking about location. Provide the available location information or explain it’s unavailable.' : ''}

Current Message:
User: ${userQuery}
AI:
    `;
  }

  private adjustResponse(userQuery: string, aiResponse: string): string {
    const skipGreetingPhrases = ['thank you', 'thanks', 'got it', 'okay', 'ok', 'bye', 'goodbye', 'appreciate it'];
    const lowerUserQuery = userQuery.toLowerCase().trim();
    if (skipGreetingPhrases.includes(lowerUserQuery) && aiResponse.startsWith('Hi')) {
      return aiResponse.replace(/^Hi\s*,?\s*/, '');
    }
    return aiResponse;
  }

  @Post('store-health-data')
  async storeHealthData(@Body() body: { watchId: number; healthData: HealthData }) {
    const { watchId, healthData } = body;
    await this.pineconeService.storeHealthData(watchId, healthData);
    return { status: 'success', message: `Health data stored for watch ${watchId}` };
  }

  @Get('get-health-data')
  async getHealthData(@Query('watchId') watchId: number) {
    const healthData = await this.pineconeService.getLatestHealthData(watchId);
    return healthData ? { status: 'success', data: healthData } : { status: 'not_found', message: `No health data found for watch ${watchId}` };
  }

  @Post('store-location-data')
  async storeLocationData(@Body() body: { watchId: number; locationData: LocationData }) {
    const { watchId, locationData } = body;
    await this.pineconeService.storeLocationData(watchId, locationData);
    return { status: 'success', message: `Location data stored for watch ${watchId}` };
  }

  @Get('latest-location-data/:watchId')
  async getLatestLocationData(@Param('watchId') watchId: number) {
    const data = await this.pineconeService.getLatestLocationData(watchId);
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