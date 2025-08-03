import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Controller, Body, UseGuards, Post, Get, Query } from '@nestjs/common';
import { CreateChatRequest, GetChatsRequest } from './dto/chat.request';
import { JwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';
import { ChatService } from './chat.service';
import { IdResponse } from 'src/shared/response';
import { SearchedChatsResponse } from './dto/chat.response';

@ApiTags('/chats')
@ApiBearerAuth()
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({ status: 201, type: IdResponse })
  @Post()
  async createChat(
    @CurrentUser() userId: string,
    @Body() { targetUserId }: CreateChatRequest,
  ): Promise<IdResponse> {
    return await this.chatService.createChat(userId, targetUserId);
  }

  @ApiOperation({ summary: '채팅방 목록 조회' })
  @ApiResponse({ status: 200, type: SearchedChatsResponse })
  @Get()
  async search(
    @CurrentUser() userId: string,
    @Query() { username, cursor, size }: GetChatsRequest,
  ): Promise<SearchedChatsResponse> {
    return await this.chatService.search({
      userId,
      size: size ?? 10,
      cursor,
      username,
    });
  }
}
