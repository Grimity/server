import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginResponse {
  @ApiProperty()
  accessToken: string;
}
