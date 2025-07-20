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

@ApiTags('/chat-messages')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'unAuthorized' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@UseGuards(JwtGuard)
@Controller('chat-messages')
export class ChatMessageController {
  constructor() {}

  @ApiOperation({ summary: '채팅 보내기' })
  @Post()
  async create(@Body() dto: CreateChatMessageRequest) {
    if (!dto.content && dto.images.length === 0)
      throw new HttpException(
        'content나 images 둘 중 하나는 반드시 있어야 합니다',
        400,
      );
  }
}
