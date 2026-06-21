import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CustomException } from 'src/core/exception/custom.exception';
import { IdResponse } from 'src/shared/response/id.response';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { ChatReader } from '../chat/repository/chat.reader';
import { ChatWriter } from '../chat/repository/chat.writer';
import { RedisService } from 'src/database/redis/redis.service';
import { TypedRedisPublisher } from 'src/database/redis/typed-redis-publisher';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import type {
  CommissionAnswerItem,
  CreateCommissionReviewRequest,
  CreateCommissionWorkMemoRequest,
  CreateCommissionWorkRequest,
  UploadCommissionWorkResultRequest,
} from './dto/commission-work.request';
import { CommissionWorkErrorCode } from './dto/commission-work.error';
import { CommissionWorkReader } from './repository/commission-work.reader';
import { CommissionWorkWriter } from './repository/commission-work.writer';
import { ChatMessageType } from '@prisma/client';

type AnswerType = 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT';

interface AnswerMeta {
  type: AnswerType;
  title: string;
  description: string | null;
  isRequired: boolean;
  options: string[];
}

@Injectable()
export class CommissionWorkService {
  constructor(
    private readonly reader: CommissionWorkReader,
    private readonly writer: CommissionWorkWriter,
    private readonly chatReader: ChatReader,
    private readonly chatWriter: ChatWriter,
    private readonly redisService: RedisService,
    private readonly redisPublisher: TypedRedisPublisher,
    private readonly eventEmitter: TypedEventEmitter,
  ) {}

  async create(
    clientId: string,
    dto: CreateCommissionWorkRequest,
  ): Promise<IdResponse> {
    const work = await this.createTransaction(clientId, dto);

    // 트랜잭션 커밋 후 시스템 메시지 전송 (채팅방 없으면 생성, 웹소켓/푸시 발송 포함)
    await this.sendCommissionSystemMessage({
      actorId: clientId,
      recipientId: dto.authorId,
      type: 'COMMISSION_REQUESTED',
      referenceId: work.id,
      content: '커미션을 신청했어요',
    });

    return work;
  }

  @Transactional()
  private async createTransaction(
    clientId: string,
    dto: CreateCommissionWorkRequest,
  ): Promise<IdResponse> {
    if (dto.authorId === clientId) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.SELF_REQUEST_NOT_ALLOWED,
      });
    }

    const author = await this.reader.findUserById(dto.authorId);
    if (!author) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.AUTHOR_NOT_FOUND,
      });
    }

    const answers = dto.commissionId
      ? await this.buildFormAnswers(dto)
      : this.buildDirectAnswers(dto);

    const work = await this.writer.create({
      authorId: dto.authorId,
      clientId,
      commissionId: dto.commissionId ?? null,
      answers,
      referenceImages: dto.referenceImages,
    });
    await this.writer.createEvent(work.id, 'REQUESTED');

    return work;
  }

  /**
   * 커미션 진행 이벤트를 시스템 메시지(=신청자/작가가 보낸 특수 메시지)로 채팅방에 전송한다.
   * 채팅방이 없으면 생성하며, 웹소켓 publish와 (수신자 미입장 시) FCM 푸시까지 처리한다.
   * 로직은 chat-message.service.ts 의 create() 흐름을 그대로 따른다.
   * actor=발신자(메시지 userId), recipient=unread+푸시 대상.
   *
   * 반드시 트랜잭션 "바깥"(xxxTransaction 커밋 후)에서 호출해야 한다.
   * 트랜잭션 내부에서 호출하면 push 핸들러(PushService)가 이미 커밋된 트랜잭션 커넥션으로
   * pushToken을 조회해 "Transaction already closed"로 실패한다.
   */
  private async sendCommissionSystemMessage(params: {
    actorId: string;
    recipientId: string;
    type: ChatMessageType;
    referenceId: string;
    content: string;
  }): Promise<void> {
    const { actorId, recipientId, type, referenceId, content } = params;

    // 1. 채팅방 find-or-create
    let chatId = await this.chatReader.findOneByUserIds([actorId, recipientId]);
    if (!chatId) {
      const chat = await this.chatWriter.createChat(actorId, recipientId);
      chatId = chat.id;
    }

    // 2. 양쪽 입장 보장 (메시지 생성 전이어야 채팅목록 미리보기가 노출됨)
    const usersStatus = await this.chatReader.findUsersStatusByChatId(chatId);
    for (const status of usersStatus) {
      if (status.enteredAt === null) {
        await this.chatWriter.enterChat(status.userId, chatId);
      }
    }

    // 3. 시스템 메시지 생성 (발신자 = actor)
    const createdMessage = await this.chatWriter.createMessage({
      userId: actorId,
      chatId,
      content,
      images: [],
      replyToId: null,
      type,
      referenceId,
    });

    // 4. 수신자가 해당 방을 보고 있는지 -> unread / push 판단
    const recipientJoined =
      Number(
        await this.redisService.pubClient.sismember(
          `user:${recipientId}:online:chats`,
          chatId,
        ),
      ) === 1;
    const recipientOnline = await this.redisService.isSubscribed(
      `user:${recipientId}`,
    );
    if (!recipientJoined) {
      await this.chatWriter.increaseUnreadCount({
        userId: recipientId,
        chatId,
        count: 1,
      });
    }

    // 5. 웹소켓 payload 빌드 (unread 증가가 반영된 chatUsers)
    const chatUsers = await this.chatReader.findUsersByChatId(chatId);
    const newMessagePayload = {
      chatId,
      senderId: actorId,
      chatUsers: chatUsers.map((user) => ({
        id: user.id,
        name: user.name,
        image: getImageUrl(user.image),
        url: user.url,
        unreadCount: user.unreadCount,
      })),
      messages: [
        {
          id: createdMessage.id,
          content: createdMessage.content,
          image: getImageUrl(createdMessage.image),
          images: createdMessage.images.map((image) => getImageUrl(image)),
          type: createdMessage.type,
          referenceId: createdMessage.referenceId,
          createdAt: createdMessage.createdAt,
          replyTo: null,
        },
      ],
    };

    // 6. 웹소켓: 발신자 본인은 항상, 수신자는 온라인일 때만
    await this.redisPublisher.publish(
      `user:${actorId}`,
      'newChatMessage',
      newMessagePayload,
    );
    if (recipientOnline) {
      await this.redisPublisher.publish(
        `user:${recipientId}`,
        'newChatMessage',
        newMessagePayload,
      );
    }

    // 7. FCM 푸시: 수신자가 해당 방 미입장일 때만
    if (!recipientJoined) {
      const actorInfo = chatUsers.find((user) => user.id === actorId);
      const recipientInfo = chatUsers.find((user) => user.id === recipientId);
      this.eventEmitter.emit('push', {
        userId: recipientId,
        title: actorInfo?.name ?? '',
        text: content,
        data: {
          event: 'newChatMessage',
          deepLink: `/chats/${chatId}`,
          data: JSON.stringify(newMessagePayload),
        },
        key: `chat-message-${chatId}`,
        badge: recipientInfo?.unreadCount,
      });
    }
  }

  async uploadResult(
    userId: string,
    workId: string,
    dto: UploadCommissionWorkResultRequest,
  ): Promise<IdResponse> {
    const work = await this.uploadResultTransaction(userId, workId, dto);

    // 작가가 신청자에게 작업물 업로드 시스템 메시지 전송
    await this.sendCommissionSystemMessage({
      actorId: work.authorId,
      recipientId: work.clientId,
      type: dto.isFinal
        ? 'COMMISSION_FINAL_UPLOADED'
        : 'COMMISSION_RESULT_UPLOADED',
      referenceId: workId,
      content: dto.isFinal
        ? '최종 작업물을 업로드했어요'
        : '작업물을 업로드했어요',
    });

    return { id: work.id };
  }

  @Transactional()
  private async uploadResultTransaction(
    userId: string,
    workId: string,
    dto: UploadCommissionWorkResultRequest,
  ) {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.authorId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
      });
    }
    if (
      work.status === 'REJECTED' ||
      work.status === 'CANCELED' ||
      work.status === 'COMPLETED'
    ) {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_ACTIVE,
      });
    }

    const status = dto.isFinal ? 'FINAL' : 'IN_PROGRESS';
    await this.writer.upsertResult(workId, dto.images, dto.isFinal, status);
    await this.writer.createEvent(
      workId,
      dto.isFinal ? 'FINAL_UPLOADED' : 'RESULT_UPLOADED',
    );

    return work;
  }

  async accept(userId: string, workId: string): Promise<IdResponse> {
    const work = await this.acceptTransaction(userId, workId);

    // 작가가 신청자에게 수락 시스템 메시지 전송
    await this.sendCommissionSystemMessage({
      actorId: work.authorId,
      recipientId: work.clientId,
      type: 'COMMISSION_ACCEPTED',
      referenceId: workId,
      content: '커미션을 수락했어요',
    });

    return { id: work.id };
  }

  @Transactional()
  private async acceptTransaction(userId: string, workId: string) {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.authorId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
      });
    }
    if (work.status !== 'PENDING') {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_PENDING,
      });
    }
    await this.writer.accept(workId);
    await this.writer.createEvent(workId, 'ACCEPTED');

    return work;
  }

  async complete(userId: string, workId: string): Promise<IdResponse> {
    const work = await this.completeTransaction(userId, workId);

    // 신청자가 작가에게 완료 시스템 메시지 전송
    await this.sendCommissionSystemMessage({
      actorId: work.clientId,
      recipientId: work.authorId,
      type: 'COMMISSION_COMPLETED',
      referenceId: workId,
      content: '커미션을 완료했어요',
    });

    return { id: work.id };
  }

  @Transactional()
  private async completeTransaction(userId: string, workId: string) {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.clientId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_CLIENT,
      });
    }
    if (
      work.status !== 'ACCEPTED' &&
      work.status !== 'IN_PROGRESS' &&
      work.status !== 'FINAL'
    ) {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_COMPLETABLE,
      });
    }
    await this.writer.complete(workId);
    await this.writer.createEvent(workId, 'COMPLETED');

    return work;
  }

  async reject(
    userId: string,
    workId: string,
    reason: string | null,
  ): Promise<IdResponse> {
    const work = await this.rejectTransaction(userId, workId, reason);

    // 작가가 신청자에게 거절 시스템 메시지 전송
    await this.sendCommissionSystemMessage({
      actorId: work.authorId,
      recipientId: work.clientId,
      type: 'COMMISSION_REJECTED',
      referenceId: workId,
      content: '커미션을 거절했어요',
    });

    return { id: work.id };
  }

  @Transactional()
  private async rejectTransaction(
    userId: string,
    workId: string,
    reason: string | null,
  ) {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.authorId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
      });
    }
    if (work.status !== 'PENDING') {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_PENDING,
      });
    }
    await this.writer.reject(workId, reason ?? null);
    await this.writer.createEvent(workId, 'REJECTED');

    return work;
  }

  async createMemo(
    userId: string,
    workId: string,
    dto: CreateCommissionWorkMemoRequest,
  ): Promise<IdResponse> {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.authorId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
      });
    }
    return await this.writer.createMemo(workId, dto.content);
  }

  async createReview(
    userId: string,
    workId: string,
    dto: CreateCommissionReviewRequest,
  ): Promise<IdResponse> {
    const work = await this.reader.findWorkById(workId);
    if (!work) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_FOUND,
      });
    }
    if (work.authorId !== userId && work.clientId !== userId) {
      throw new CustomException(403, {
        errorCode: CommissionWorkErrorCode.NOT_COMMISSION_PARTICIPANT,
      });
    }
    if (work.status !== 'COMPLETED') {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.WORK_NOT_COMPLETED,
      });
    }
    const existing = await this.reader.findReview(workId, userId);
    if (existing) {
      throw new CustomException(409, {
        errorCode: CommissionWorkErrorCode.ALREADY_REVIEWED,
      });
    }

    const revieweeId = work.authorId === userId ? work.clientId : work.authorId;
    return await this.writer.createReview({
      workId,
      reviewerId: userId,
      revieweeId,
      rating: dto.rating,
      content: dto.content ?? null,
    });
  }

  private async buildFormAnswers(
    dto: CreateCommissionWorkRequest,
  ): Promise<PrismaJson.CommissionAnswer[]> {
    const commission = await this.reader.findCommissionWithQuestions(
      dto.commissionId!,
    );
    if (!commission) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.COMMISSION_NOT_FOUND,
      });
    }
    if (commission.authorId !== dto.authorId) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.COMMISSION_AUTHOR_MISMATCH,
      });
    }

    const answers = dto.answers ?? [];
    if (answers.length !== commission.questions.length) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.ANSWERS_LENGTH_MISMATCH,
      });
    }

    return commission.questions.map((q, i) =>
      this.buildAnswer(
        {
          type: q.type as AnswerType,
          title: q.title,
          description: q.description ?? null,
          isRequired: q.isRequired,
          options: q.options,
        },
        answers[i],
      ),
    );
  }

  private buildDirectAnswers(
    dto: CreateCommissionWorkRequest,
  ): PrismaJson.CommissionAnswer[] {
    const answers = dto.answers ?? [];
    return answers.map((a) => {
      if (!a.type) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.ANSWER_TYPE_REQUIRED,
        });
      }
      const title = (a.title ?? '').trim();
      if (title.length === 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.ANSWER_TITLE_REQUIRED,
        });
      }
      const isRequired = a.isRequired ?? false;
      const options = a.type === 'TEXT' ? [] : (a.options ?? []);
      if (a.type !== 'TEXT' && options.length === 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.SELECT_OPTIONS_REQUIRED,
        });
      }
      return this.buildAnswer(
        {
          type: a.type,
          title,
          description: a.description ?? null,
          isRequired,
          options,
        },
        a,
      );
    });
  }

  private buildAnswer(
    meta: AnswerMeta,
    a: CommissionAnswerItem,
  ): PrismaJson.CommissionAnswer {
    let text: string | null = null;
    let selectedOptions: string[] = [];
    let attachedImages: string[] = [];

    if (meta.type === 'TEXT') {
      text = (a.text ?? '').trim();
      if (meta.isRequired && text.length === 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.TEXT_ANSWER_REQUIRED,
        });
      }
      if (a.selectedOptions && a.selectedOptions.length > 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.TEXT_HAS_SELECTED_OPTIONS,
        });
      }
      attachedImages = a.attachedImages ?? [];
    } else {
      if (a.text !== undefined && a.text !== null && a.text !== '') {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.SELECT_HAS_TEXT,
        });
      }
      if (a.attachedImages && a.attachedImages.length > 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.SELECT_HAS_ATTACHED_IMAGES,
        });
      }
      const chosen = a.selectedOptions ?? [];
      const optionSet = new Set(meta.options);
      for (const o of chosen) {
        if (!optionSet.has(o)) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SELECTED_OPTION_NOT_IN_OPTIONS,
          });
        }
      }
      if (new Set(chosen).size !== chosen.length) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.SELECTED_OPTIONS_DUPLICATED,
        });
      }
      if (meta.type === 'SINGLE_SELECT') {
        if (meta.isRequired && chosen.length !== 1) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
          });
        }
        if (!meta.isRequired && chosen.length > 1) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
          });
        }
      } else {
        if (meta.isRequired && chosen.length === 0) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.MULTI_SELECT_ANSWER_REQUIRED,
          });
        }
      }
      selectedOptions = chosen;
    }

    return {
      type: meta.type,
      title: meta.title,
      description: meta.description,
      isRequired: meta.isRequired,
      options: meta.options,
      text,
      selectedOptions,
      attachedImages,
    };
  }
}
