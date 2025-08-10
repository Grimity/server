import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from 'src/module/report/report.service';
import { ReportWriter } from 'src/module/report/repository/report.writer';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportWriter],
})
export class ReportModule {}
