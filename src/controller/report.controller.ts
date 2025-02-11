import { Controller } from '@nestjs/common';
import { ReportService } from 'src/provider/report.service';

@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}
}
