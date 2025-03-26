import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { HealthData } from '../types/health-data';
import { LocationData } from '../types/location-data';

@Injectable()
export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY');
    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME');

    if (!pineconeApiKey || !openAiApiKey || !this.indexName) {
      throw new Error('Missing required API keys or index name');
    }

    this.pinecone = new Pinecone({ apiKey: pineconeApiKey });
    this.openai = new OpenAI({ apiKey: openAiApiKey } as any);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 3072,
    });
    return response.data[0].embedding;
  }
  private locationIndexName = 'locations-index'; // or get from config

  async initializeLocationIndex() {
    const indexList = await this.pinecone.listIndexes();
    const indexNames = indexList.indexes?.map(index => index.name) || [];
  
    if (!indexNames.includes(this.locationIndexName)) {
      await this.pinecone.createIndex({
        name: this.locationIndexName,
        dimension: 2, // Only need 2 dimensions for lat/long
        metric: "euclidean", // Better for geographic distances
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log(`✅ Created location index: ${this.locationIndexName}`);
    }
  }

  async storeVector(id: string, text: string) {
    const index = this.pinecone.index(this.indexName);
    const embedding = await this.generateEmbedding(text);

    await index.upsert([
      {
        id,
        values: embedding,
        metadata: { text, timestamp: new Date().toISOString() },
      },
    ]);
    console.log(`✅ Stored vector for ID: ${id}`);
  }

  async querySimilarVectors(queryText: string, topK = 20) {
    const index = this.pinecone.index(this.indexName);
    const embedding = await this.generateEmbedding(queryText);

    const result = await index.query({
      vector: embedding,
      topK,
      includeValues: false,
      includeMetadata: true,
    });

    return result.matches;
  }

  async storeHealthData(userId: string, healthData: HealthData) {
    const index = this.pinecone.index(this.indexName);
    const namespace = index.namespace('health');
    const vectorId = `health:${userId}`;

    const healthDataString = JSON.stringify(healthData);
    const embedding = await this.generateEmbedding(healthDataString);

    await namespace.upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          healthData: healthDataString,
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    console.log(`✅ Stored health data for ID: ${vectorId}`);
  }

  async getLatestHealthData(userId: string): Promise<HealthData | null> {
    const index = this.pinecone.index(this.indexName);
    const namespace = index.namespace('health');
    const vectorId = `health:${userId}`;

    const result = await namespace.fetch([vectorId]);

    if (!result.records || !result.records[vectorId]) return null;

    const vector = result.records[vectorId];

    if (vector && vector.metadata?.healthData) {
      try {
        return JSON.parse(vector.metadata.healthData as string) as HealthData;
      } catch (e) {
        console.error('Error parsing health data:', e);
        return null;
      }
    }
    return null;
  }

  async storeLocationData(userId: string, locationData: LocationData) {
    await this.initializeLocationIndex(); // Ensure index exists
    const index = this.pinecone.index(this.locationIndexName);
    
    await index.upsert([
      {
        id: `location:${userId}`,
        values: [locationData.latitude, locationData.longitude],
        metadata: {
          location: locationData.location ?? "",
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    console.log(`✅ Stored location data for ID: ${userId}`);
  }
  
  // Update getLatestLocationData similarly
  async getLatestLocationData(userId: string): Promise<LocationData | null> {
    const index = this.pinecone.index(this.locationIndexName);
    const result = await index.fetch([`location:${userId}`]);
  
    if (!result.records || !result.records[`location:${userId}`]) return null;
  
    const vector = result.records[`location:${userId}`];
    if (vector && vector.values.length === 2) {
      return {
        latitude: vector.values[0],
        longitude: vector.values[1],
        location: vector.metadata?.location ? String(vector.metadata.location) : undefined,
      };
    }
    return null;
  }
}