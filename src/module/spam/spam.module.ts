import { Module } from '@nestjs/common';
import { SpamDetectionListener } from './spam-detection.listener';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PostModule],
  providers: [SpamDetectionListener],
})
export class SpamModule {}
