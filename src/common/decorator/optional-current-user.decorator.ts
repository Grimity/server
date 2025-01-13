import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const OptionalCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user: { id: string } | null | undefined }>();

    if (!req.user) {
      return null;
    }

    return req.user.id;
  },
);
