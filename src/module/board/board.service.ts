import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { BoardLinkPermission, BoardMemberPermission } from '@prisma/client';
import { randomInt } from 'crypto';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { IdResponse } from 'src/shared/response/id.response';
import { DEFAULT_BOARD_MAX_MEMBERS } from './board-limits';
import { BoardRealtimeService } from './board-realtime.service';
import { BoardStrokeService } from './board-stroke.service';
import { BoardTokenClaims, BoardTokenService } from './board-token.service';
import type { BoardChange } from './board.protocol';
import {
  BoardMemberResponse,
  BoardPermission,
  BoardSnapshotResponse,
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
  maxMembers: number | null;
};

export type BoardConnection = {
  permission: BoardPermission;
  isOwner: boolean;
  maxMembers: number;
};

@Injectable()
export class BoardService {
  private readonly defaultMaxMembers: number;

  constructor(
    config: ConfigService,
    private readonly boardReader: BoardReader,
    private readonly boardWriter: BoardWriter,
    private readonly boardToken: BoardTokenService,
    private readonly boardStroke: BoardStrokeService,
    private readonly realtime: BoardRealtimeService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    const configured = Number(config.get<string>('BOARD_MAX_MEMBERS'));
    this.defaultMaxMembers =
      Number.isInteger(configured) && configured > 0
        ? configured
        : DEFAULT_BOARD_MAX_MEMBERS;
  }

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
    await this.assertSeat(
      board,
      userId,
      userMember?.id ?? null,
      this.getPreviousGuestId(boardId, previousToken),
    );

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
  async verifyConnection(claims: BoardTokenClaims): Promise<BoardConnection> {
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
    // 탈퇴한 사용자의 행(userId·name 모두 null)도 다시 쓰지 못한다.
    if (
      !member ||
      member.userId !== claims.userId ||
      (member.userId === null && member.name === null)
    ) {
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
    return {
      permission,
      isOwner: this.isOwner(board, member.userId),
      maxMembers: this.maxMembersOf(board),
    };
  }

  /** 스냅샷은 게스트도 받아야 하므로 로그인 대신 보드 토큰으로 인증하고, 권한은 DB로 다시 확인한다. */
  async getSnapshot(
    boardId: string,
    token: string | undefined,
    cursor: number,
  ): Promise<BoardSnapshotResponse> {
    const claims = this.boardToken.verify(token);
    if (!claims || claims.boardId !== boardId) {
      throw new HttpException('BOARD_TOKEN', 401);
    }
    await this.verifyConnection(claims);
    return await this.boardStroke.getSnapshot(boardId, cursor);
  }

  private isOwner(board: JoinableBoard, userId: string | null) {
    return userId !== null && board.ownerId === userId;
  }

  private maxMembersOf(board: JoinableBoard) {
    return board.maxMembers ?? this.defaultMaxMembers;
  }

  // 이미 접속 중인 참여자(다른 탭)는 자리를 차지하고 있으므로 통과한다. 소유자는 항상 들어올 수 있다.
  private async assertSeat(
    board: JoinableBoard,
    userId: string | null,
    userMemberId: string | null,
    guestMemberId: string | null,
  ) {
    if (this.isOwner(board, userId)) return;
    const online = await this.realtime.onlineMemberIds(board.id);
    const seated =
      (userMemberId !== null && online.has(userMemberId)) ||
      (guestMemberId !== null && online.has(guestMemberId));
    if (!seated && online.size >= this.maxMembersOf(board)) {
      throw new HttpException('BOARD_FULL', 409);
    }
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
    // 이미 사용자 행이 있으면 게스트의 획을 옮기고 게스트 행을 지운다.
    const change = await this.mergeGuest(boardId, guestId, userId);
    if (!change) return null;
    // 커밋된 뒤에 알린다. 게스트로 붙어 있던 다른 탭은 다시 입장해 새 신원을 받는다.
    this.realtime.emitChange(boardId, change);
    await this.realtime.disconnectMember(boardId, guestId);
    return guestId;
  }

  private async mergeGuest(
    boardId: string,
    guestId: string,
    userId: string,
  ): Promise<BoardChange | null> {
    return await this.txHost.withTransaction(async () => {
      // 같은 게스트를 동시에 합쳐도 하나만 진행되도록 잠근 뒤에 확인한다.
      await this.boardStroke.lock(boardId);
      const guest = await this.boardReader.findGuestMember(boardId, guestId);
      const userMember = await this.boardReader.findUserMember(boardId, userId);
      if (!guest || !userMember) return null;
      const change = await this.boardStroke.merge(
        boardId,
        guestId,
        userMember.id,
      );
      await this.boardWriter.deleteGuestMember(boardId, guestId);
      return change;
    });
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
      isOwner: member.userId !== null && board.ownerId === member.userId,
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
