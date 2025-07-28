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
import { CreateChatRequest, JoinChatRequest } from './dto/chat.request';
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

  @ApiOperation({ summary: '채팅방 입장' })
  @ApiResponse({ status: 204 })
  @Put(':id/join')
  @HttpCode(204)
  async joinChat(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) chatId: string,
    @Body() { socketId }: JoinChatRequest,
  ) {
    return await this.chatService.joinChat({
      userId,
      chatId,
      socketId,
    });
  }

  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiResponse({ status: 204 })
  @Delete(':id/join')
  async leaveChat(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) chatId: string,
    @Body() { socketId }: JoinChatRequest,
  ) {}
}
