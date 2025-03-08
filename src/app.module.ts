import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { WatchModule } from './watches/watch.module'; // Ensure this import is correct
import { WhatsappModule } from './whatsapp/whatsapp.module';
@Module({
  imports: [
    ConfigModule.forRoot(), // Add this to load .env files
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
      ssl: false, // Explicitly set
      logging: true,
      // Remove SSL-related extra
      extra: {
        connectionLimit: 10,
      },
    }),
    UserModule,
    WatchModule,
    WhatsappModule,
  ],
})
export class AppModule {}