import { ApiProperty } from '@nestjs/swagger';

export class RefreshSuccessDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
