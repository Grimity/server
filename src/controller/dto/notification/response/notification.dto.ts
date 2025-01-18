import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ enum: ['LIKE', 'COMMENT', 'FOLLOW'] })
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';

  @ApiProperty({ description: '알림 아이디' })
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty()
  actorName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    type: 'string',
    description: 'LIKE, COMMENT 일때만 있음',
  })
  feedId: string | null;
}
