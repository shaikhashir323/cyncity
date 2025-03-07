import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // ✅ Corrected

  // Enable CORS if needed
  app.enableCors();

  // Ensure the app listens on the correct port
  const port = process.env.PORT || 3000;
  console.log(`🚀 Server running on port ${port}`);

  await app.listen(port);

  // Prevent automatic shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
  });
}
bootstrap();
