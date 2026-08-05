import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  const config = new DocumentBuilder()
    .setTitle('Portail API')
    .setDescription('API pour le portail des avocats')
    .setVersion('1.0')
    .addTag('portail')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 21501);
}
bootstrap();
