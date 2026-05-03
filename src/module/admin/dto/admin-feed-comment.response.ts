import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from 'src/module/user/dto/user.base.response';
import { CursorResponse } from 'src/shared/response/cursor.response';

export class AdminFeedCommentWriterResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;
}

export class AdminFeedCommentFeedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;
}

export class AdminLatestFeedCommentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: '대댓글이면 부모 댓글 id, 일반 댓글이면 null',
  })
  parentId: string | null;

  @ApiProperty({ type: AdminFeedCommentWriterResponse })
  writer: AdminFeedCommentWriterResponse;

  @ApiProperty({ type: AdminFeedCommentFeedResponse })
  feed: AdminFeedCommentFeedResponse;
}

export class AdminLatestFeedCommentsResponse extends CursorResponse {
  @ApiProperty({ type: AdminLatestFeedCommentResponse, isArray: true })
  comments: AdminLatestFeedCommentResponse[];
}

export class AdminChildFeedCommentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ type: UserBaseResponse })
  writer: UserBaseResponse;

  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class AdminParentFeedCommentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ type: UserBaseResponse })
  writer: UserBaseResponse;

  @ApiProperty({ type: AdminChildFeedCommentResponse, isArray: true })
  childComments: AdminChildFeedCommentResponse[];
}
