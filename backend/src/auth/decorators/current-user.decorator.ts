import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface LawyerPayload {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): LawyerPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
