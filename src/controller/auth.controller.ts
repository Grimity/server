import { Controller, Body, Post, Get, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from 'src/provider/auth.service';
import {
  LoginDto,
  RegisterDto,
  Register409Dto,
  RegisterSuccessDto,
  LoginSuccessDto,
} from './dto/auth';
import { GetClientInfo } from 'src/common/decorator';
import { ClientInfo } from 'src/types';

@ApiTags('/auth')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: LoginSuccessDto,
  })
  @ApiResponse({
    status: 404,
    description: '회원 없음',
  })
  @HttpCode(200)
  @Post('login')
  async login(
    @GetClientInfo() clientInfo: ClientInfo,
    @Body() { provider, providerAccessToken }: LoginDto,
  ): Promise<LoginSuccessDto> {
    return this.authService.login({
      provider,
      providerAccessToken,
      clientInfo,
    });
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: RegisterSuccessDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 있는 회원 or 닉네임 중복',
    type: Register409Dto,
  })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterSuccessDto> {
    return await this.authService.register(registerDto);
  }
}
