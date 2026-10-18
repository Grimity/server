import {
  Controller,
  Body,
  Post,
  Get,
  HttpCode,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
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
import { WebSessionService } from './web-session.service';

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
@ApiTags('auth')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private webSessions: WebSessionService,
  ) {}

  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, type: LoginResponse })
  @ApiResponse({ status: 404, description: '회원 없음' })
  @UseGuards(UserAgentGuard)
  @HttpCode(200)
  @Post('login')
  async login(
    @GetClientInfo() clientInfo: ClientInfo,
    @Body() { provider, providerAccessToken, deviceId }: LoginRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { webSession, ...tokens } = await this.authService.login(
      {
        provider,
        providerAccessToken,
        deviceId,
      },
      clientInfo,
      this.webSessions.isBrowserRequest(request),
    );
    if (webSession) {
      await this.webSessions.revokeCookie(this.webSessions.readCookie(request));
      this.webSessions.writeCookie(response, webSession);
    }
    return tokens;
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, type: LoginResponse })
  @ApiResponse({ status: 409, type: Register409Response })
  @UseGuards(UserAgentGuard)
  @Post('register')
  async register(
    @GetClientInfo() clientInfo: ClientInfo,
    @Body() dto: RegisterRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { webSession, ...tokens } = await this.authService.register(
      dto,
      clientInfo,
      this.webSessions.isBrowserRequest(request),
    );
    if (webSession) {
      await this.webSessions.revokeCookie(this.webSessions.readCookie(request));
      this.webSessions.writeCookie(response, webSession);
    }
    return tokens;
  }

  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: '토큰 재발급',
    description:
      'Authorization 헤더의 refreshToken을 우선 사용합니다. 헤더가 없을 때만 공유 쿠키를 사용하며, 잘못된 헤더는 쿠키로 우회하지 않습니다.',
  })
  @ApiResponse({ status: 200, type: JwtResponse })
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  async refresh(
    @CurrentUser() userId: string,
    @GetRefreshToken() token: string | undefined,
    @GetClientInfo() clientInfo: ClientInfo,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<JwtResponse> {
    const { webSession, ...tokens } = request.webSession
      ? await this.authService.refreshSession(request.webSession, clientInfo)
      : await this.authService.refresh(
          userId,
          token!,
          clientInfo,
          this.webSessions.isBrowserRequest(request),
        );
    if (webSession) this.webSessions.writeCookie(response, webSession);
    return tokens;
  }

  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: '로그아웃',
    description:
      '헤더 refreshToken을 우선 사용하고, 헤더가 없으면 공유 쿠키를 사용합니다. 다른 계정의 쿠키는 헤더 인증 결과나 로그아웃에 영향을 주지 않습니다.',
  })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() userId: string,
    @GetRefreshToken() token: string | undefined,
    @GetClientInfo() clientInfo: ClientInfo,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.webSession) {
      await this.webSessions.revoke(userId, request.webSession.sessionId);
      this.webSessions.clearCookie(response);
      return;
    }

    await this.authService.logout(userId, token!, clientInfo);
    if (this.webSessions.isBrowserRequest(request)) {
      const cookie = this.webSessions.readCookie(request);
      // A header for A must never revoke or clear B's cookie session.
      if (!cookie || this.webSessions.belongsToUser(cookie, userId)) {
        await this.webSessions.revokeCookie(cookie);
        this.webSessions.clearCookie(response);
      }
    }
  }
}
