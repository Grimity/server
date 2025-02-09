import { ApiProperty } from '@nestjs/swagger';

export class CreatedCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ type: 'string' })
  writerId: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  parentId: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  mentionedUserId: string | null;
}
