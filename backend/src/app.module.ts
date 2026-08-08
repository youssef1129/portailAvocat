import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { PublicModule } from './public/public.module';
import { MetricsModule } from './metrics/metrics.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    AuthModule,
    RequestsModule,
    PublicModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 secondes en ms
        limit: 100, // limite globale par défaut, généreuse — le vrai throttle se fait par route
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
