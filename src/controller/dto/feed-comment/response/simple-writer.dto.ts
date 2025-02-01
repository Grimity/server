import { ApiProperty } from '@nestjs/swagger';

export class SimpleWriterDto {
  @ApiProperty({ description: '작성자 ID' })
  id: string;

  @ApiProperty({ description: '작성자 이름' })
  name: string;

  @ApiProperty({
    description: '작성자 이미지',
    nullable: true,
    type: 'string',
    example: 'profile/{UUID}.jpg',
  })
  image: string | null;
}
