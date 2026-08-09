// backend/src/export-swagger.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';

async function exportSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  const config = new DocumentBuilder()
    .setTitle('Portail de Dépôt de Pièces')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'avocat-jwt',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'deposit-session',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));

  console.log('swagger-spec.json généré.');
  await app.close();
}

exportSwagger();
