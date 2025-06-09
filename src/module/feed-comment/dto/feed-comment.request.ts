import { ApiProperty } from '@nestjs/swagger';
import { Length, IsUUID, IsOptional } from 'class-validator';
import { TrimString } from '../../../shared/request/validator';

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

  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @TrimString()
  @Length(1, 1000)
  content: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '언급된 사용자의 UUID',
    type: 'string',
  })
  @IsOptional()
  @IsUUID()
  mentionedUserId?: string | null;
}

export class GetFeedCommentRequest {
  @ApiProperty()
  @IsUUID()
  feedId: string;
}
