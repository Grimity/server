import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from 'src/module/report/report.service';
import { ReportRepository } from 'src/module/report/repository/report.repository';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
