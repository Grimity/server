import { ApiProperty } from '@nestjs/swagger';

export const boardPermissions = ['EDIT'] as const;
export type BoardPermission = (typeof boardPermissions)[number];

export const boardMemberTypes = ['USER', 'GUEST'] as const;
export type BoardMemberType = (typeof boardMemberTypes)[number];

export class BoardMemberResponse {
  @ApiProperty({
    description: '보드 참여자 ID. 로그인 사용자와 게스트 모두 이 값으로 구분',
  })
  id: string;

  @ApiProperty({
    description: '로그인 사용자의 userId. 게스트는 null',
    nullable: true,
    type: 'string',
  })
  userId: string | null;

  @ApiProperty({ enum: boardMemberTypes, enumName: 'BoardMemberType' })
  type: BoardMemberType;

  @ApiProperty()
  name: string;

  @ApiProperty({
    example: 'https://image.grimity.com/profile/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  image: string | null;
}

export class JoinBoardResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: boardPermissions, enumName: 'BoardPermission' })
  permission: BoardPermission;

  @ApiProperty({ type: BoardMemberResponse })
  member: BoardMemberResponse;

  @ApiProperty({
    description:
      '보드 소유자 여부. 소유자의 지우개는 모든 사람의 그림을 지웁니다.',
  })
  isOwner: boolean;

  @ApiProperty({
    description:
      '로그인 사용자가 이전 게스트 토큰을 보내 이번 요청에서 계정에 연결된 게스트의 참여자 ID. 연결하지 않았으면 null',
    nullable: true,
    type: 'string',
  })
  claimedGuestId: string | null;

  @ApiProperty({
    description:
      '보드 소켓 연결에 쓰는 토큰. 비로그인 사용자는 저장해 두었다가 다시 입장할 때 보냅니다.',
  })
  boardToken: string;
}

export const boardStrokeTools = ['pen', 'eraser'] as const;
export const boardEraseScopes = ['own', 'all'] as const;

export class BoardBrushResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  version: number;
}

export class BoardStrokeResponse {
  @ApiProperty({ description: '획 스키마 버전' })
  v: number;

  @ApiProperty({ description: '클라이언트가 만든 획 ID' })
  id: string;

  @ApiProperty({ description: '보드 안의 변경 순서. 작은 것부터 그립니다.' })
  seq: number;

  @ApiProperty({ description: '작성자 BoardMember.id' })
  authorId: string;

  @ApiProperty({ enum: boardStrokeTools, enumName: 'BoardStrokeTool' })
  tool: (typeof boardStrokeTools)[number];

  @ApiProperty({ type: BoardBrushResponse })
  brush: BoardBrushResponse;

  @ApiProperty({ example: '#35373c' })
  color: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ enum: boardEraseScopes, enumName: 'BoardEraseScope' })
  eraseScope: (typeof boardEraseScopes)[number];

  @ApiProperty({
    type: [String],
    description: 'points 한 점의 값 순서',
    example: ['x', 'y', 'pressure', 't', 'tiltX', 'tiltY'],
  })
  channels: string[];

  @ApiProperty({
    type: [Number],
    description: 'channels 길이 × 점 개수만큼의 숫자',
  })
  points: number[];
}

export class BoardSnapshotResponse {
  @ApiProperty({
    description:
      '이 페이지를 읽기 직전의 마지막 변경 순서. 첫 페이지의 값 이후 변경을 소켓으로 이어 받습니다.',
  })
  lastSeq: number;

  @ApiProperty({
    type: [BoardStrokeResponse],
    description: '지금 보이는 획. seq 오름차순',
  })
  strokes: BoardStrokeResponse[];

  @ApiProperty({
    description: '다음 페이지의 cursor. 마지막 페이지면 null',
    nullable: true,
    type: 'number',
  })
  nextCursor: number | null;
}
