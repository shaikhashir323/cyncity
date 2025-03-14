import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // Import ConfigModule to use ConfigService
    HttpModule, // Import HttpModule to use HttpService
  ],
  providers: [WhatsappService],
  exports: [WhatsappService], // Export the service if it needs to be used in other modules
})
export class WhatsappModule {}