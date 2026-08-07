import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1', {
    // /metrics must stay at the root so Prometheus can scrape it directly,
    // and /health must stay at the root so the existing docker healthcheck
    // (http://127.0.0.1:21501/health) keeps working unchanged.
    exclude: ['health', 'metrics'],
  });

  const config = new DocumentBuilder()
    .setTitle('Portail API')
    .setDescription('API pour le portail des avocats')
    .setVersion('1.0')
    .addTag('portail')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'avocat-jwt',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'deposit-session',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 21501);
}
bootstrap();
