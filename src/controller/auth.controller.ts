import { Controller, Body, Post } from '@nestjs/common';
import { AuthService } from 'src/provider/auth.service';
import { LoginDto, RegisterDto } from './dto/auth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() { provider, providerAccessToken }: LoginDto) {
    return this.authService.login(provider, providerAccessToken);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
