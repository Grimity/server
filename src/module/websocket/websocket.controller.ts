import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NewChatMessageEventResponse } from '../chat/dto';

@ApiTags('WebSocket 명세용 가짜 컨트롤러')
@Controller('websocket')
export class WebsocketController {
  @ApiOperation({
    summary: '웹소켓 연결',
    description: `
      const clientSocket = io('https://api.grimity.com', {
        auth: {
          accessToken,
        },
      });
    `,
  })
  @ApiResponse({
    description: `
      잘 연결됐으면 'connected' 이벤트 발생
    `,
  })
  @Get()
  connect() {}

  @Get('newChatMessage')
  @ApiOperation({
    summary: '새로운 채팅 메시지 이벤트',
    description: `
      멀티디바이스 지원으로 내가 보낸 메시지여도 나한테 이벤트가 발생되며 room에 join하지 않은 상태여도 온라인이면 무조건 이벤트 발생합니다.
      그럼 join api는 필요없지 않느냐 라고 할 수 있지만 join한 상태면 unreadCount 증가시키면 안돼서 쩔수쩔수;;
      내가 메시지를 보냈던 대상자와 나한테 똑같은 타입의 이벤트가 발생함.
    `,
  })
  @ApiResponse({
    description: `이벤트 타입: 'newChatMessage'`,
    type: NewChatMessageEventResponse,
  })
  newChatMessage() {}
}
