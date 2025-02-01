import { ApiProperty } from '@nestjs/swagger';
import {
  Length,
  IsString,
  IsUUID,
  ValidateIf,
  IsOptional,
} from 'class-validator';

export class CreateFeedCommentDto {
  @ApiProperty()
  @IsUUID()
  feedId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '부모 댓글의 UUID',
    type: 'string',
  })
  @ValidateIf((o) => o.parentCommentId !== null)
  @IsUUID()
  @IsOptional()
  parentCommentId?: string | null;

  @ApiProperty()
  @IsString()
  @Length(1, 1000)
  content: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '언급된 사용자의 UUID',
  })
  @ValidateIf((o) => o.mentionedUserId !== null)
  @IsOptional()
  @IsUUID()
  mentionedUserId?: string | null;
}
