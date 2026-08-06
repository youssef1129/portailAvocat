import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { AuthModule } from 'src/auth/auth.module';
import { PublicModule } from 'src/public/public.module';
import { RequestsModule } from 'src/requests/requests.module';
import { StorageModule } from 'src/storage/storage.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    PublicModule,
    RequestsModule,
    StorageModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
