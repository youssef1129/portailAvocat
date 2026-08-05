import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { lawyerProviders } from './lawyer.provider';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';

        return {
          secret,
          signOptions: {
            // Cast or parse to ensure strict type safety
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [...lawyerProviders, AuthService, JwtStrategy, JwtAuthGuard],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PassportModule,
    JwtModule,
    ...lawyerProviders,
  ],
})
export class AuthModule {}
