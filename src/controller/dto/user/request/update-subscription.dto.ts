import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

const subscriptionTypes = [
  'FOLLOW',
  'FEED_LIKE',
  'FEED_COMMENT',
  'FEED_REPLY',
  'POST_COMMENT',
  'POST_REPLY',
] as const;

type SubscriptionType = (typeof subscriptionTypes)[number];

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: subscriptionTypes, isArray: true })
  @IsEnum(subscriptionTypes, { each: true })
  subscription: SubscriptionType[];
}
