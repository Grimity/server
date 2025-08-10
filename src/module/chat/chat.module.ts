import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserModule } from '../user/user.module';
import { ChatMessageController } from './chat-message.controller';
import { ChatMessageService } from './chat-message.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [UserModule, WebsocketModule],
  controllers: [ChatController, ChatMessageController],
  providers: [ChatService, ChatReader, ChatWriter, ChatMessageService],
})
export class ChatModule {}
