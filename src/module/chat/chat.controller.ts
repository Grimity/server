import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Controller, Body, UseGuards, Post } from '@nestjs/common';
import { CreateChatRequest } from './dto/chat.request';
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
}
