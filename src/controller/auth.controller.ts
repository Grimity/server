import { Controller, Body, Post } from '@nestjs/common';
import { AuthService } from 'src/provider/auth.service';
import { LoginDto } from './dto/auth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() { provider, providerAccessToken }: LoginDto) {
    return this.authService.login(provider, providerAccessToken);
  }
}
