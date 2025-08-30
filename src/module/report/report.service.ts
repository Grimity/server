import { Injectable } from '@nestjs/common';
import { ReportWriter } from 'src/module/report/repository/report.writer';

@Injectable()
export class ReportService {
  constructor(private reportWriter: ReportWriter) {}

  async create(input: CreateInput) {
    console.log('!!!!!!!!!!!!!!!!!!신고 생성!!!!!!!!!!!!!!!!!');
    await this.reportWriter.create(input);
    return;
  }
}

type CreateInput = {
  userId: string;
  type: string;
  refType: string;
  refId: string;
  content: string | null;
};
