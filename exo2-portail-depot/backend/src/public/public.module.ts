import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';
import { DepositSessionStrategy } from './strategies/deposit-session.strategy';
import { DepositSessionGuard } from './guards/deposit-session.guard';
import { PublicController } from './public.controller';
import { PublicService } from './services/public.service';
import { publicProviders } from './public.providers';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    PassportModule.register({
      defaultStrategy: 'deposit-session',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule, MetricsModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>('DEPOSIT_SESSION_EXPIRES_IN') ?? '30m';
        return {
          secret: configService.get<string>('DEPOSIT_SESSION_SECRET'),
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
    StorageModule,
  ],
  controllers: [PublicController],
  providers: [
    PublicService,
    DepositSessionStrategy,
    DepositSessionGuard,
    ...publicProviders,
  ],
  exports: [PublicService, DepositSessionGuard],
})
export class PublicModule {}
