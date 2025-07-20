import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Controller,
  Body,
  Post,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { JwtGuard } from 'src/core/guard';
import { CreateChatMessageRequest } from './dto/chat-message.request';
import { ChatMessageService } from './chat-message.service';
import { CurrentUser } from 'src/core/decorator';

@ApiTags('/chat-messages')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'unAuthorized' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@UseGuards(JwtGuard)
@Controller('chat-messages')
export class ChatMessageController {
  constructor(private readonly chatMessageService: ChatMessageService) {}

  @ApiOperation({ summary: '채팅 보내기' })
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() { content, chatId, replyToId, images }: CreateChatMessageRequest,
  ) {
    if (!content && images.length === 0)
      throw new HttpException(
        'content나 images 둘 중 하나는 있어야 합니다',
        400,
      );

    await this.chatMessageService.create({
      userId,
      chatId,
      content,
      replyToId,
      images,
    });
    return;
  }
}
