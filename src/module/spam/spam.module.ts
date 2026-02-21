import { Module } from '@nestjs/common';
import { SpamDetectionListener } from './spam-detection.listener';

@Module({
  providers: [SpamDetectionListener],
})
export class SpamModule {}
