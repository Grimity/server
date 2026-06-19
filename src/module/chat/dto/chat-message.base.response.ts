import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', nullable: true })
  content: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    deprecated: true,
    description: 'DEPRECATED: images[0]와 동일. images 사용 권장',
    example: 'https://image.grimity.com/chat/123.webp',
  })
  image: string | null;

  @ApiProperty({
    type: 'string',
    isArray: true,
    description: '메시지에 묶인 이미지들 (최대 5개, 없으면 빈 배열)',
    example: ['https://image.grimity.com/chat/123.webp'],
  })
  images: string[];

  @ApiProperty()
  createdAt: Date;
}
