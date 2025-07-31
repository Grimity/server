import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Controller,
  Body,
  UseGuards,
  Post,
  Put,
  Param,
  ParseUUIDPipe,
  Delete,
  HttpCode,
} from '@nestjs/common';
import {
  CreateChatRequest,
  JoinChatRequest,
  LeaveChatRequest,
} from './dto/chat.request';
import { JwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';
import { ChatService } from './chat.service';
import { IdResponse } from 'src/shared/response';

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

  @ApiOperation({ summary: '채팅방 삭제' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 404,
    description: '채팅방이없거나 내가 그방 유저가 아니거나',
  })
  @Delete(':id')
  @HttpCode(204)
  async deleteChat(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) chatId: string,
  ) {
    await this.chatService.deleteChat(userId, chatId);
    return;
  }

  @ApiOperation({ summary: '채팅방 입장' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  @Put(':id/join')
  @HttpCode(204)
  async joinChat(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) chatId: string,
    @Body() { socketId }: JoinChatRequest,
  ) {
    await this.chatService.joinChat({
      userId,
      chatId,
      socketId,
    });
    return;
  }

  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiResponse({ status: 204 })
  @Put(':id/leave')
  @HttpCode(204)
  async leaveChat(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) chatId: string,
    @Body() { socketId }: LeaveChatRequest,
  ) {
    await this.chatService.leaveChat({
      userId,
      socketId,
      chatId,
    });
    return;
  }
}
