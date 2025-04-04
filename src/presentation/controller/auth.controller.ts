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
} from '@nestjs/swagger';
import { AuthService } from 'src/provider/auth.service';
import {
  LoginRequest,
  RegisterRequest,
  CheckNameRequest,
} from '../request/auth.request';
import {
  LoginResponse,
  JwtResponse,
  Register409Response,
} from '../response/auth.response';
import {
  GetClientInfo,
  GetRefreshToken,
  CurrentUser,
} from 'src/core/decorator';
import { ClientInfo } from 'src/types';
import { UserAgentGuard, JwtRefreshGuard } from 'src/core/guard';

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

  @ApiOperation({ summary: '이름 중복 확인' })
  @ApiResponse({ status: 204, description: '중복 이름 없음' })
  @ApiResponse({ status: 409, description: '중복' })
  @Post('register/name')
  @HttpCode(204)
  async checkName(@Body() { name }: CheckNameRequest) {
    await this.authService.checkNameOrThrow(name);
    return;
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
