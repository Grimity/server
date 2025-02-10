import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from 'src/common/constants';

export class SubscribeQuery {
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum([
    'ALL',
    'FOLLOW',
    'FEED_LIKE',
    'FEED_COMMENT',
    'FEED_REPLY',
    'POST_COMMENT',
    'POST_REPLY',
  ])
  type: Exclude<NotificationType, 'FEED_MENTION' | 'POST_MENTION'> | 'ALL';
}
