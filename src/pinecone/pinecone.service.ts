import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { HealthData } from '../types/health-data'; // Import the shared type

@Injectable()
export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY');
    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME');

    if (!pineconeApiKey) {
      throw new Error('Missing PINECONE_API_KEY in environment variables');
    }
    if (!openAiApiKey) {
      throw new Error('Missing OPENAI_API_KEY in environment variables');
    }
    if (!this.indexName) {
      throw new Error('Missing PINECONE_INDEX_NAME in environment variables');
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
    console.log(`✅ Stored vector for ID: ${id} with text: ${text}`);
  }

  async querySimilarVectors(queryText: string, topK = 20): Promise<any[]> {
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
    console.log(`✅ Stored health data for ID: ${vectorId}`, healthData);
  }

  async getLatestHealthData(userId: string): Promise<HealthData | null> {
    const index = this.pinecone.index(this.indexName);
    const namespace = index.namespace('health');
    const vectorId = `health:${userId}`;

    const result = await namespace.fetch([vectorId]);
    const vector = result.records[vectorId];

    if (vector && vector.metadata?.healthData) {
      const healthDataString = String(vector.metadata.healthData);
      return JSON.parse(healthDataString) as HealthData;
    }
    return null;
  }
}
