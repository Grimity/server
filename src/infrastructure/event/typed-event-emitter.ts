import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName, EventPayloadMap } from './event-payload.types';

@Injectable()
export class TypedEventEmitter {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit<K extends EventName>(event: K, payload: EventPayloadMap[K]) {
    return this.eventEmitter.emit(event, payload);
  }
}
