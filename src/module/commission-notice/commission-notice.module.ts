import { Module } from '@nestjs/common';
import { CommissionNoticeReader } from './repository/commission-notice.reader';
import { CommissionNoticeWriter } from './repository/commission-notice.writer';

@Module({
  providers: [CommissionNoticeReader, CommissionNoticeWriter],
  exports: [CommissionNoticeReader, CommissionNoticeWriter],
})
export class CommissionNoticeModule {}
