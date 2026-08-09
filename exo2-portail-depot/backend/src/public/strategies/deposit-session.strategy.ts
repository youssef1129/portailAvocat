import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PublicService } from '../services/public.service';

@Injectable()
export class DepositSessionStrategy extends PassportStrategy(
  Strategy,
  'deposit-session',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly publicService: PublicService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('DEPOSIT_SESSION_SECRET') ||
        process.env.DEPOSIT_SESSION_SECRET ||
        '',
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string }) {
    const request = await this.publicService.findRequestById(payload.sub);
    if (!request) {
      throw new UnauthorizedException('Invalid deposit session token.');
    }
    return { requestId: request.id };
  }
}
