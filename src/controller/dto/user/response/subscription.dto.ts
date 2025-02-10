import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, notificationTypesArray } from 'src/common/constants';

export class SubscriptionDto {
  @ApiProperty({
    enum: [
      'FOLLOW',
      'FEED_LIKE',
      'FEED_COMMENT',
      'FEED_REPLY',
      'POST_COMMENT',
      'POST_REPLY',
    ],
    isArray: true,
  })
  subscription: NotificationType[];
}
