import { HttpException, Injectable } from '@nestjs/common';
import { BoardLinkPermission, BoardMemberPermission } from '@prisma/client';
import { randomInt } from 'crypto';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { IdResponse } from 'src/shared/response/id.response';
import { BoardTokenClaims, BoardTokenService } from './board-token.service';
import {
  BoardMemberResponse,
  BoardPermission,
  JoinBoardResponse,
} from './dto/board.response';
import { createGuestName } from './guest-name';
import { BoardReader } from './repository/board.reader';
import { BoardWriter } from './repository/board.writer';

const GUEST_NAME_ATTEMPTS = 5;

type JoinableBoard = {
  id: string;
  title: string;
  ownerId: string;
  linkPermission: BoardLinkPermission;
};

@Injectable()
export class BoardService {
  constructor(
    private readonly boardReader: BoardReader,
    private readonly boardWriter: BoardWriter,
    private readonly boardToken: BoardTokenService,
  ) {}

  async create(userId: string): Promise<IdResponse> {
    return await this.boardWriter.create(userId);
  }

  async join(
    boardId: string,
    userId: string | null,
    previousToken?: string,
  ): Promise<JoinBoardResponse> {
    const board = await this.boardReader.findOneById(boardId);
    if (!board) {
      throw new HttpException('BOARD', 404);
    }

    const userMember = userId
      ? await this.boardReader.findUserMember(boardId, userId)
      : null;
    const permission = this.getPermission(
      board,
      userId,
      userMember?.permission ?? null,
    );
    if (!permission) {
      // 비로그인 사용자는 로그인하면 초대받은 계정으로 입장할 수 있다.
      throw new HttpException('BOARD_ACCESS', userId ? 403 : 401);
    }

    if (!userId) {
      const member = await this.getGuestMember(boardId, previousToken);
      return this.toJoinResponse(board, permission, member, null);
    }
    // 게스트를 먼저 연결해야 사용자 행이 없을 때 게스트 행을 그대로 이어받는다.
    const claimedGuestId = await this.claimGuest(
      boardId,
      userId,
      previousToken,
    );
    const member = await this.getUserMember(boardId, userId);
    return this.toJoinResponse(board, permission, member, claimedGuestId);
  }

  // 소켓 연결 때 토큰 발급 이후 바뀐 것이 없는지 다시 확인한다.
  async verifyConnection(claims: BoardTokenClaims): Promise<BoardPermission> {
    const board = await this.boardReader.findOneById(claims.boardId);
    if (!board) {
      throw new HttpException('BOARD', 404);
    }

    // 게스트가 계정에 연결되면 게스트 행이 지워지거나 사용자 행으로 바뀐다.
    // 바뀐 행을 예전 게스트 토큰으로 쓰지 못하게 userId까지 비교한다.
    const member = await this.boardReader.findMember(
      claims.boardId,
      claims.memberId,
    );
    if (!member || member.userId !== claims.userId) {
      throw new HttpException('BOARD_MEMBER', 401);
    }

    const permission = this.getPermission(
      board,
      member.userId,
      member.permission,
    );
    if (!permission) {
      throw new HttpException('BOARD_ACCESS', 403);
    }
    return permission;
  }

  // 참여자 행이 있다고 권한이 있는 것은 아니다. 권한은 여기서만 판단한다.
  private getPermission(
    board: JoinableBoard,
    userId: string | null,
    memberPermission: BoardMemberPermission | null,
  ): BoardPermission | null {
    if (userId && board.ownerId === userId) return 'EDIT';
    if (memberPermission) return memberPermission;
    if (board.linkPermission === BoardLinkPermission.EDIT) return 'EDIT';
    return null;
  }

  private async getUserMember(
    boardId: string,
    userId: string,
  ): Promise<BoardMemberResponse> {
    const user = await this.boardReader.findUser(userId);
    if (!user) {
      throw new HttpException('USER', 401);
    }
    const { id } = await this.boardWriter.upsertUserMember(boardId, userId);
    return {
      id,
      userId,
      type: 'USER',
      name: user.name,
      image: getImageUrl(user.image),
    };
  }

  private async getGuestMember(
    boardId: string,
    previousToken?: string,
  ): Promise<BoardMemberResponse> {
    // 만료된 토큰도 서명이 유효하면 같은 게스트로 본다. 권한은 위에서 다시 판단했다.
    // 계정에 연결된 게스트는 다시 게스트로 쓰지 않는다.
    const previousGuestId = this.getPreviousGuestId(boardId, previousToken);
    const guest =
      (previousGuestId &&
        (await this.boardReader.findGuestMember(boardId, previousGuestId))) ||
      (await this.createGuestMember(boardId));
    return {
      id: guest.id,
      userId: null,
      type: 'GUEST',
      name: guest.name ?? '',
      image: null,
    };
  }

  private async createGuestMember(boardId: string) {
    // 보드 안에서 이름이 겹치면 다시 뽑고, 그래도 겹치면 숫자를 붙인다.
    for (let attempt = 0; attempt < GUEST_NAME_ATTEMPTS * 2; attempt++) {
      const name =
        attempt < GUEST_NAME_ATTEMPTS
          ? createGuestName()
          : `${createGuestName()} ${randomInt(1000, 10000)}`;
      const guest = await this.boardWriter.createGuestMember(boardId, name);
      if (guest) return guest;
    }
    throw new Error('Failed to create a unique board guest name');
  }

  private async claimGuest(
    boardId: string,
    userId: string,
    previousToken?: string,
  ): Promise<string | null> {
    const guestId = this.getPreviousGuestId(boardId, previousToken);
    if (!guestId) return null;
    // 이 보드에 사용자 행이 없으면 게스트 행을 사용자 행으로 바꿔 그대로 잇는다.
    if (await this.boardWriter.convertGuestToUser(boardId, guestId, userId)) {
      return guestId;
    }
    // 이미 사용자 행이 있으면 게스트 행을 합친다.
    // TODO: 획 저장을 만들면 같은 트랜잭션에서 게스트 획을 사용자 행으로 옮긴 뒤 지운다.
    const deleted = await this.boardWriter.deleteGuestMember(boardId, guestId);
    return deleted ? guestId : null;
  }

  private getPreviousGuestId(
    boardId: string,
    previousToken?: string,
  ): string | null {
    const previous = this.boardToken.verify(previousToken, true);
    if (previous?.boardId !== boardId || previous.type !== 'GUEST') return null;
    return previous.memberId;
  }

  private toJoinResponse(
    board: JoinableBoard,
    permission: BoardPermission,
    member: BoardMemberResponse,
    claimedGuestId: string | null,
  ): JoinBoardResponse {
    return {
      id: board.id,
      title: board.title,
      permission,
      member,
      claimedGuestId,
      boardToken: this.boardToken.issue({
        boardId: board.id,
        memberId: member.id,
        userId: member.userId,
        type: member.type,
        name: member.name,
        image: member.image,
        permission,
      }),
    };
  }
}
