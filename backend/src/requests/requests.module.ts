import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { requestsProviders } from './requests.providers';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    StorageModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService, ...requestsProviders],
  exports: [...requestsProviders],
})
export class RequestsModule {}
