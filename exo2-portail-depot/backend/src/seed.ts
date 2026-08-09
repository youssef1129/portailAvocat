import { NestFactory } from '@nestjs/core';
import { SeedModule } from './database/seed/seed.module';
import { SeedService } from './database/seed/seed.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seed');

  try {
    const appContext = await NestFactory.createApplicationContext(SeedModule);
    const seedService = appContext.get(SeedService);

    await seedService.seed();

    await appContext.close();
    logger.log('Seeding process finished.');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed!', error);
    process.exit(1);
  }
}

bootstrap();
