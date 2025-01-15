import { ApiProperty } from '@nestjs/swagger';

export class LoginSuccessDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  id: string;
}
