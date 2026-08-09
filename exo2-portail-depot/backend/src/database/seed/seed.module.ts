import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database.module';
import { lawyerProviders } from 'src/auth/lawyer.provider';
import { requestsProviders } from 'src/requests/requests.providers';
import { SeedService } from './seed.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
  providers: [SeedService, ...lawyerProviders, ...requestsProviders],
  exports: [SeedService],
})
export class SeedModule {}
