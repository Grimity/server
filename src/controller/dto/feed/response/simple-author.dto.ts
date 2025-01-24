import { ApiProperty } from '@nestjs/swagger';

export class SimpleAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: '작성자 이미지',
    nullable: true,
    example: 'profile/{UUID}.jpg',
    type: 'string',
  })
  image: string | null;
}
