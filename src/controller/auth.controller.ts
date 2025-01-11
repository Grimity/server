import { Controller, Body, Post, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from 'src/provider/auth.service';
import { LoginDto, RegisterDto, Register409Dto } from './dto/auth';
import { JwtGuard } from 'src/common/guard';

@ApiTags('/auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '로그인' })
  @Post('login')
  async login(@Body() { provider, providerAccessToken }: LoginDto) {
    return this.authService.login(provider, providerAccessToken);
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 409,
    description: '이미 있는 회원 or 닉네임 중복',
    type: Register409Dto,
  })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'JWT Guard 테스트용 엔드포인트' })
  @UseGuards(JwtGuard)
  @Get('test')
  async test() {
    return true;
  }
}
