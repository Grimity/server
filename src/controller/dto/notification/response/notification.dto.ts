import { ApiProperty } from '@nestjs/swagger';

class ActorDto {
  @ApiProperty({ description: '알림을 발생시킨 사용자 ID' })
  id: string;

  @ApiProperty({ description: '알림을 발생시킨 사용자 이름' })
  name: string;
}

export class NotificationDto {
  @ApiProperty({ description: '알림 ID' })
  id: string;

  @ApiProperty({
    description: '알림 타입',
    enum: ['LIKE', 'COMMENT', 'FOLLOW'],
  })
  type: string;

  @ApiProperty({
    description: '참조 ID - COMMENT나 LIKE의 경우 피드ID가 담겨있음',
    nullable: true,
    type: 'string',
  })
  refId: string | null;

  @ApiProperty({ description: '알림을 읽었는지 여부' })
  isRead: boolean;

  @ApiProperty({ description: '알림 생성일자' })
  createdAt: Date;

  @ApiProperty({ description: '알림을 발생시킨 사용자 정보', type: ActorDto })
  actor: ActorDto;
}
