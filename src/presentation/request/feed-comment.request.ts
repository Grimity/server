import { ApiProperty } from '@nestjs/swagger';
import { Length, IsUUID, IsOptional } from 'class-validator';
import { TrimString } from './helper';

export class CreateFeedCommentRequest {
  @ApiProperty()
  @IsUUID()
  feedId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '부모 댓글의 UUID',
    type: 'string',
  })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string | null;

  @ApiProperty()
  @TrimString()
  @Length(1, 3000)
  content: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '언급된 사용자의 UUID',
  })
  @IsOptional()
  @IsUUID()
  mentionedUserId?: string | null;
}

export class GetParentFeedCommentRequest {
  @ApiProperty()
  @IsUUID()
  feedId: string;
}
