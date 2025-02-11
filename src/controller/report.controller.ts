import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportService } from 'src/provider/report.service';
import { CreateReportDto } from './dto/report';
import { CurrentUser } from 'src/common/decorator';
import { JwtGuard } from 'src/common/guard';

@UseGuards(JwtGuard)
@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post()
  async create(@CurrentUser() userId: string, @Body() dto: CreateReportDto) {
    await this.reportService.create({
      userId,
      ...dto,
      content: dto.content ? dto.content : null,
    });
    return;
  }
}
