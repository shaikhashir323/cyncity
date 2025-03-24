import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { WatchModule } from './watches/watch.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AuthModule } from './auth/auth.module'; // ✅ Import AuthModule
import { OpenAIService } from './openai/openai.service';
import { CommunicationController } from './communication/communication.controller';
import { PineconeService } from './pinecone/pinecone.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
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
    AuthModule, // ✅ Ensure AuthModule is included
  ],
  providers: [OpenAIService, PineconeService],
  controllers: [CommunicationController], // ✅ Remove AuthController if not needed
})
export class AppModule {}
