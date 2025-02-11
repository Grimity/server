import { Module } from '@nestjs/common';
import { ReportController } from 'src/controller/report.controller';
import { ReportService } from 'src/provider/report.service';
import { ReportRepository } from 'src/repository/report.repository';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
