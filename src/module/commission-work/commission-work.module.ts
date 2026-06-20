import { Module } from '@nestjs/common';
import { CommissionWorkController } from './commission-work.controller';
import { CommissionWorkService } from './commission-work.service';
import { CommissionWorkReader } from './repository/commission-work.reader';
import { CommissionWorkWriter } from './repository/commission-work.writer';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [CommissionWorkController],
  providers: [
    CommissionWorkService,
    CommissionWorkReader,
    CommissionWorkWriter,
  ],
})
export class CommissionWorkModule {}
