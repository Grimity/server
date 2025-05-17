import {
  Controller,
  Body,
  Post,
  Get,
  HttpCode,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from 'src/module/auth/auth.service';
import { LoginRequest, RegisterRequest } from './dto/auth.request';
import {
  LoginResponse,
  JwtResponse,
  Register409Response,
} from './dto/auth.response';
import {
  GetClientInfo,
  GetRefreshToken,
  CurrentUser,
} from 'src/core/decorator';
import type { ClientInfo } from 'src/shared/types/client-info';
import { UserAgentGuard, JwtRefreshGuard } from 'src/core/guard';

@ApiHeader({
  name: 'grimity-app-device',
  description: '앱에서만 사용되는 속성입니다',
  required: false,
  enum: ['mobile', 'tablet'],
})
@ApiHeader({
  name: 'grimity-app-model',
  description: '앱에서만 사용되는 속성입니다',
  required: false,
})
@ApiTags('/auth')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, type: LoginResponse })
  @ApiResponse({ status: 404, description: '회원 없음' })
  @UseGuards(UserAgentGuard)
  @HttpCode(200)
  @Post('login')
  async login(
    @GetClientInfo() clientInfo: ClientInfo,
    @Body() { provider, providerAccessToken }: LoginRequest,
  ): Promise<LoginResponse> {
    return this.authService.login(
      {
        provider,
        providerAccessToken,
      },
      clientInfo,
    );
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, type: LoginResponse })
  @ApiResponse({ status: 409, type: Register409Response })
  @UseGuards(UserAgentGuard)
  @Post('register')
  async register(
    @GetClientInfo() clientInfo: ClientInfo,
    @Body() dto: RegisterRequest,
  ): Promise<LoginResponse> {
    let temp: string;
    if (dto.id) {
      temp = dto.id;
    } else {
      if (!dto.url) throw new HttpException('URL', 400);
      temp = dto.url;
    }
    return await this.authService.register(
      {
        ...dto,
        url: temp,
      },
      clientInfo,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '토큰 재발급 - refT를 담아야함' })
  @ApiResponse({ status: 200, type: JwtResponse })
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  async refresh(
    @CurrentUser() userId: string,
    @GetRefreshToken() token: string,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<JwtResponse> {
    return await this.authService.refresh(userId, token, clientInfo);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃 - refT를 담아야함' })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() userId: string,
    @GetRefreshToken() token: string,
    @GetClientInfo() clientInfo: ClientInfo,
  ) {
    await this.authService.logout(userId, token, clientInfo);
    return;
  }
}
