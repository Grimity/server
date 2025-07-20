import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserModule } from '../user/user.module';
import { ChatMessageController } from './chat-message.controller';

@Module({
  imports: [UserModule],
  controllers: [ChatController, ChatMessageController],
  providers: [ChatService, ChatReader, ChatWriter],
})
export class ChatModule {}
