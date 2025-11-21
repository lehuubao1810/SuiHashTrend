import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as bodyParser from 'body-parser';

import WebSocket from 'ws';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// Polyfill WebSocket for Node.js
global.WebSocket = WebSocket as any;

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const config = new DocumentBuilder()
    .setTitle('Tên API của bạn') // Tiêu đề hiển thị trên Swagger UI
    .setDescription('Mô tả chi tiết về API') // Mô tả
    .setVersion('1.0') // Phiên bản
    .addTag('users') // Thêm tag (tùy chọn)
    .addBearerAuth() // Nếu API của bạn dùng JWT Bearer token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'https://sui-hash-trend.vercel.app'],
    credentials: true,
  });

  const port = process.env.PORT || 8080;
   // Tăng giới hạn JSON payload lên 50MB
   app.use(bodyParser.json({ limit: '50mb' }));
   app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  await app.listen(port);

  // console.log('='.repeat(60));
  // console.log(`🚀 Application is running on: http://localhost:${port}`);
  // console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  // console.log(`🔌 WebSocket server on: ws://localhost:${process.env.WS_PORT}`);
  // console.log('='.repeat(60));
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
