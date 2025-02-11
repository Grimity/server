import { Injectable } from '@nestjs/common';
import { ReportRepository } from 'src/repository/report.repository';

@Injectable()
export class ReportService {
  constructor(private reportRepository: ReportRepository) {}
}
