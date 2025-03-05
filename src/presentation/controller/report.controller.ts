import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReportService } from 'src/provider/report.service';
import { CreateReportRequest } from '../request/report.request';
import { CurrentUser } from 'src/common/decorator';
import { JwtGuard } from 'src/common/guard';

@ApiBearerAuth()
@ApiTags('/reports')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtGuard)
@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @ApiOperation({ summary: '신고하기' })
  @ApiResponse({ status: 201, description: '성공' })
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateReportRequest,
  ) {
    await this.reportService.create({
      userId,
      ...dto,
      content: dto.content ? dto.content : null,
    });
    return;
  }
}
