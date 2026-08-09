import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface DepositSessionPayload {
  requestId: string;
}

export const DepositSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DepositSessionPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
