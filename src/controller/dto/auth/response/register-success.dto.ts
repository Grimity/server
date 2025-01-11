import { ApiProperty } from '@nestjs/swagger';

export class RegisterSuccessDto {
  @ApiProperty()
  accessToken: string;
}
