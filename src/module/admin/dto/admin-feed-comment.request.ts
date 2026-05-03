import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { TrimString } from 'src/shared/request/validator';

export class AdminGetFeedCommentsRequest {
  @ApiProperty({ required: false, description: '없으면 처음부터' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}

export class CreateAdminFeedCommentRequest {
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
