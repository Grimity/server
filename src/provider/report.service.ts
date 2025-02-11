import { Injectable } from '@nestjs/common';
import { ReportRepository } from 'src/repository/report.repository';

@Injectable()
export class ReportService {
  constructor(private reportRepository: ReportRepository) {}

  async create(input: CreateInput) {
    await this.reportRepository.create(input);
    return;
  }
}

type CreateInput = {
  userId: string;
  type: number;
  refType: string;
  refId: string;
  content: string | null;
};
