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
  Put,
  Param,
  ParseUUIDPipe,
  Delete,
  HttpCode,
  Get,
  Query,
} from '@nestjs/common';
import { JwtGuard } from 'src/core/guard';
import { CreateChatMessageRequest } from './dto/chat-message.request';
import { ChatMessageService } from './chat-message.service';
import { CurrentUser } from 'src/core/decorator';

@ApiTags('/chat-messages')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@UseGuards(JwtGuard)
@Controller('chat-messages')
export class ChatMessageController {
  constructor(private readonly chatMessageService: ChatMessageService) {}

  @ApiOperation({ summary: '채팅 보내기' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: '내가 그 채팅방의 일원이 아님' })
  @ApiResponse({ status: 404, description: '채팅방이 없음' })
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

  @Get()
  async getMessages(
    @CurrentUser() userId: string,
    @Query('chatId', new ParseUUIDPipe()) chatId: string,
  ) {
    console.log(chatId);
  }

  @ApiOperation({ summary: '채팅 좋아요' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '메시지가없음' })
  @Put(':id/like')
  @HttpCode(204)
  async likeMessage(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) messageId: string,
  ) {
    await this.chatMessageService.createLike(userId, messageId);
    return;
  }

  @ApiOperation({ summary: '채팅 좋아요 취소' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '메시지가없음' })
  @Delete(':id/like')
  @HttpCode(204)
  async unlikeMessage(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) messageId: string,
  ) {
    await this.chatMessageService.deleteLike(userId, messageId);
    return;
  }
}
