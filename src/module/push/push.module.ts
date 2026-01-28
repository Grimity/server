import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushRepository } from './push.repository';

@Module({
  providers: [PushService, PushRepository],
  exports: [PushService],
})
export class PushModule {}
