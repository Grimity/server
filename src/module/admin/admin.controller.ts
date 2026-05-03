import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginRequest } from './dto/admin.request';
import { AdminLoginResponse } from './dto/admin.response';

@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @ApiOperation({ summary: '어드민 로그인' })
  @ApiResponse({ status: 200, type: AdminLoginResponse })
  @ApiResponse({ status: 401, description: 'id 또는 password 불일치' })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: AdminLoginRequest): Promise<AdminLoginResponse> {
    return await this.adminService.login(dto);
  }
}
