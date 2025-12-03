import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', nullable: true })
  content: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://image.grimity.com/chat/123.webp',
  })
  image: string | null;

  @ApiProperty()
  createdAt: Date;
}
