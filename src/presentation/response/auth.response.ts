import { ApiProperty } from '@nestjs/swagger';

export class JwtResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class LoginResponse extends JwtResponse {
  @ApiProperty()
  id: string;
}

export class Register409Response {
  @ApiProperty({ enum: [409] })
  statusCode: 409;

  @ApiProperty({ enum: ['NAME', 'URL'] })
  message: 'NAME' | 'URL';
}
