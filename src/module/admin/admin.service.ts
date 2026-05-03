import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(input: AdminLoginInput) {
    const adminId = this.configService.get('ADMIN_ID');
    const adminPassword = this.configService.get('ADMIN_PASSWORD');

    if (input.id !== adminId || input.password !== adminPassword) {
      throw new HttpException('UNAUTHORIZED', 401);
    }

    const accessToken = this.jwtService.sign(
      { sub: 'admin' },
      {
        secret: this.configService.get('JWT_ADMIN_SECRET'),
        expiresIn: this.configService.get('JWT_ADMIN_EXPIRES_IN'),
      },
    );

    return { accessToken };
  }
}

export type AdminLoginInput = {
  id: string;
  password: string;
};
