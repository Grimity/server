import { HttpException } from '@nestjs/common';

export class CustomException<T extends string = string> extends HttpException {
  constructor(status: number, body: { errorCode: T }) {
    super({ status, ...body }, status);
  }
}
