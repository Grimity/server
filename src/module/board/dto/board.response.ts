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
