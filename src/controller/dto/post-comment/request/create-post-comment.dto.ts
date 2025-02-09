import { ApiProperty } from '@nestjs/swagger';
import { Length, IsUUID, ValidateIf, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostCommentDto {
  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '부모 댓글의 UUID',
    type: 'string',
  })
  @ValidateIf((o) => o.parentCommentId !== null)
  @IsOptional()
  @IsUUID()
  parentCommentId?: string | null;

  @ApiProperty({ description: '1~1000자' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 1000)
  content: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: '언급된 사용자의 UUID',
    type: 'string',
  })
  @ValidateIf((o) => o.mentionedUserId !== null)
  @IsOptional()
  @IsUUID()
  mentionedUserId?: string | null;
}
