import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostTypeEnum } from 'src/common/constants/post.constant';
import { removeHtml } from 'src/shared/util/remove-html';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { IdResponse } from 'src/shared/response/id.response';
import { AdminPostWriter } from './repository/admin-post.writer';
import { CreateAdminNoticeRequest } from './dto/admin-notice.request';

function extractImage(htmlString: string): string | null {
  const imgTagMatch = htmlString.match(/<img[^>]+src="([^">]+)"/);
  return imgTagMatch ? imgTagMatch[1] : null;
}

@Injectable()
export class AdminNoticeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: TypedEventEmitter,
    private readonly adminPostWriter: AdminPostWriter,
  ) {}

  async create(dto: CreateAdminNoticeRequest): Promise<IdResponse> {
    const officialUserId = this.configService.get<string>('OFFICIAL_USER_ID');
    if (!officialUserId) {
      throw new HttpException('OFFICIAL_USER_ID_NOT_CONFIGURED', 500);
    }

    const parsedContent = removeHtml(dto.content);
    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const thumbnail = extractImage(dto.content);

    const post = await this.adminPostWriter.create({
      authorId: officialUserId,
      title: dto.title,
      content: dto.content,
      type: PostTypeEnum.NOTICE,
      thumbnail,
    });

    this.eventEmitter.emit('post:CREATED', {
      postId: post.id,
      title: dto.title,
      content: parsedContent,
    });

    return post;
  }
}
