import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ description: '클릭 시 이동할 페이지 FULL URL' })
  link: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;

  @ApiProperty()
  message: string;
}
