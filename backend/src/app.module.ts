import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { PublicModule } from './public/public.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    AuthModule,
    RequestsModule,
    PublicModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
