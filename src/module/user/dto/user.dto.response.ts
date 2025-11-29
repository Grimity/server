import { ApiProperty } from '@nestjs/swagger';

export class UserBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    example: 'profile/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  image: string | null;

  @ApiProperty({ description: '라우팅용 url' })
  url: string;
}
