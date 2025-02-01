import { ApiProperty } from '@nestjs/swagger';
import { SimpleWriterDto } from './simple-writer.dto';

class MentionedUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ChildCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: SimpleWriterDto })
  writer: SimpleWriterDto;

  @ApiProperty({ type: MentionedUser, nullable: true })
  mentionedUser: MentionedUser | null;
}
