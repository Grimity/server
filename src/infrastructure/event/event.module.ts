import { Global, Module } from '@nestjs/common';
import { TypedEventEmitter } from './typed-event-emitter';

@Global()
@Module({
  providers: [TypedEventEmitter],
  exports: [TypedEventEmitter],
})
export class EventModule {}
