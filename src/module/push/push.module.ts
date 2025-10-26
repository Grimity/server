import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushRepository } from './push.repository';
import { PushController } from './push.controller';

@Module({
  controllers: [PushController],
  providers: [PushService, PushRepository],
  exports: [PushService],
})
export class PushModule {}
