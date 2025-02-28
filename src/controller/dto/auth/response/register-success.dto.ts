import { ApiProperty } from '@nestjs/swagger';

export class RegisterSuccessDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
