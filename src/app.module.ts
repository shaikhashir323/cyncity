import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { WatchModule } from './watches/watch.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OpenAIService } from './openai/openai.service';
import { CommunicationController } from './communication/communication.controller';
import { AuthController } from './auth/auth.controller';
import { PineconeService } from './pinecone/pinecone.service'; // Import PineconeService

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    HttpModule, // Import HttpModule globally
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
      ssl: false,
      logging: true,
      extra: {
        connectionLimit: 10,
      },
    }),
    UserModule,
    WatchModule,
    WhatsappModule,
  ],
  providers: [OpenAIService, PineconeService], // Provide OpenAIService
  controllers: [CommunicationController, AuthController],
})
export class AppModule {}