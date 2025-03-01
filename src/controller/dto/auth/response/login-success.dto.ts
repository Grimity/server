import { ApiProperty } from '@nestjs/swagger';

export class LoginSuccessDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
