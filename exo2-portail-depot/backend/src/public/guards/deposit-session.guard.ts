import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DepositSessionGuard extends AuthGuard('deposit-session') {}
