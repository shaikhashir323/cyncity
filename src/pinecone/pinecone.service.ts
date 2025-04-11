import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { HealthData } from '../types/health-data';
import { LocationData } from '../types/location-data';
import { WatchService } from '../watches/watch.service';

@Injectable()
export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private watchService: WatchService,
  ) {
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

  private locationIndexName = 'locations-index';

  async initializeLocationIndex() {
    const indexList = await this.pinecone.listIndexes();
    const indexNames = indexList.indexes?.map(index => index.name) || [];

    if (!indexNames.includes(this.locationIndexName)) {
      await this.pinecone.createIndex({
        name: this.locationIndexName,
        dimension: 2,
        metric: 'euclidean',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      console.log(`✅ Created location index: ${this.locationIndexName}`);
    }
  }

  async storeVector(id: string, text: string, metadata?: Record<string, any>) {
    const index = this.pinecone.index(this.indexName);
    const embedding = await this.generateEmbedding(text);
  
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: { text, timestamp: new Date().toISOString(), ...metadata },
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

  async storeHealthData(watchId: number, healthData: HealthData) {
    const index = this.pinecone.index(this.indexName);
    const namespace = index.namespace('health');

    const watch = await this.watchService.getWatchById(watchId);
    if (!watch) {
      console.error(`No watch found for watchId: ${watchId}`);
      return;
    }

    const vectorId = `health:${watchId}`;
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

  async getLatestHealthData(watchId: number): Promise<HealthData | null> {
    const index = this.pinecone.index(this.indexName);
    const namespace = index.namespace('health');

    const watch = await this.watchService.getWatchById(watchId);
    if (!watch) {
      console.error(`No watch found for watchId: ${watchId}`);
      return null;
    }

    const vectorId = `health:${watchId}`;
    const result = await namespace.fetch([vectorId]);
    const vector = result.records?.[vectorId];

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

  async storeLocationData(watchId: number, locationData: LocationData) {
    await this.initializeLocationIndex();
    const index = this.pinecone.index(this.locationIndexName);

    const watch = await this.watchService.getWatchById(watchId);
    if (!watch) {
      console.error(`No watch found for watchId: ${watchId}`);
      return;
    }

    await index.upsert([
      {
        id: `location:${watchId}`,
        values: [locationData.latitude, locationData.longitude],
        metadata: {
          location: locationData.location ?? '',
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    console.log(`✅ Stored location data for ID: ${watchId}`);
  }

  async getLatestLocationData(watchId: number): Promise<LocationData | null> {
    const index = this.pinecone.index(this.locationIndexName);

    const watch = await this.watchService.getWatchById(watchId);
    if (!watch) {
      console.error(`No watch found for watchId: ${watchId}`);
      return null;
    }

    const result = await index.fetch([`location:${watchId}`]);
    const vector = result.records?.[`location:${watchId}`];

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