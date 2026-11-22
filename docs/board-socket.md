# 보드 소켓 규약 (`/boards`)

그리미티 보드(board.grimity.com)의 실시간 연결 규약이다.
타입은 `src/module/board/board.protocol.ts`, 구현은 `board.gateway.ts`.
프론트는 `grimity-board/src/features/board/realtime/protocol.ts`에 같은 타입을 복사해 쓴다. **한쪽을 바꾸면 둘 다 고친다.**

소켓 규약은 DB보다 바꾸기 어렵다. 배포한 뒤에도 사용자 브라우저에는 예전 코드가 열린 탭이 남아,
서버와 클라이언트가 서로 다른 버전으로 동시에 붙는다. 그래서 아래 규칙을 지킨다.

---

## 1. 바꾸는 규칙

- **규약 버전**: 서버는 `BOARD_PROTOCOL_VERSION`(지금 1)을 말하고 `MIN_BOARD_PROTOCOL_VERSION`~`BOARD_PROTOCOL_VERSION`을 받는다.
  - **호환되는 변경**(필드·이벤트 추가)은 버전을 올리지 않는다.
  - **호환되지 않는 변경**(필드 삭제·이름 변경·의미 변경)은 버전을 올린다. 예전 클라이언트를 더 받지 않을 때 `MIN`을 올린다.
  - 배포 순서: 서버가 새 버전과 예전 버전을 함께 받게(`MIN` 유지) 먼저 배포 → 프론트 배포 → 예전 탭이 충분히 사라진 뒤 `MIN` 올림.
- **이벤트 이름**: `영역:동작`(`members:joined`, `stroke:commit`, `presence:cursor`). 예외로 연결 직후 메시지는 `hello`.
- **본문은 항상 객체**: 배열·숫자 하나만 보내지 않는다. 필드를 늘릴 자리를 남긴다.
- **모르는 것은 무시**: 양쪽 모두 모르는 이벤트·필드·enum 값을 받으면 무시한다(에러로 끊지 않는다).
  그래야 한쪽이 먼저 기능을 추가해도 다른 쪽이 죽지 않는다.
- **제한값은 서버가 내려준다**: 클라이언트에 상수로 박지 않고 `hello.limits`로 받는다.

---

## 2. 연결

```ts
io(`${API}/boards`, {
  auth: { boardToken, protocol: 1 },  // 연결할 때마다 최신 값을 넣는다(auth 함수)
  transports: ['websocket'],          // sticky session 없이 여러 서버에 붙는다
});
```

`boardToken`은 `POST /boards/:id/join`이 발급한다. 인증은 `namespace.use` 미들웨어에서 하고,
거절하면 클라이언트는 `connect_error`를 받는다.

| `message` | `data.statusCode` | 뜻 | 클라이언트 처리 |
| --- | --- | --- | --- |
| `PROTOCOL` | 426 | 규약 버전이 없거나 지원 범위 밖. `data.minProtocol`, `data.maxProtocol` 포함. **토큰보다 먼저 확인** | 내 버전 < min이면 새로고침 안내, > max면(배포 중 예전 서버) 잠시 뒤 다시 연결 |
| `BOARD_TOKEN` | 401 | 토큰이 없거나 만료·위조 | 입장 API로 새 토큰을 받아 다시 연결 |
| `BOARD_MEMBER` | 401 | 참여자 행이 없거나 다른 사람 것이 됨(게스트 → 계정 합치기) | 위와 같음 |
| `BOARD` | 404 | 보드 없음 | 접근 불가 화면 |
| `BOARD_ACCESS` | 403 | 지금 권한 없음 | 접근 불가 화면 |
| `BOARD_FULL` | 409 | 동시 참여 인원이 가득 참 | "꽉 찼어요" 화면 |
| `INTERNAL` | 500 | 서버 오류 | 잠시 뒤 같은 토큰으로 다시 연결 |

---

## 3. 서버 → 클라이언트

### `hello` (연결 직후 나에게 한 번)

```ts
{
  protocol: 1,
  serverTime: number,                       // ms. 시계 차이 보정용
  self: { memberId: string, permission: 'EDIT', isOwner: boolean },
  members: BoardMemberResponse[],           // 지금 접속 중, 나 포함, 먼저 들어온 순
  limits: Record<string, number>,           // 5-4. 키가 없으면 제한 없음
  seq: number,                              // 이 시점의 마지막 변경 순서
}
```

연결할 때마다 다시 온다. 클라이언트는 접속자 목록을 통째로 바꾼다.
`hello` 전에 온 입장·퇴장 이벤트는 모아 뒀다가 목록을 바꾼 뒤 순서대로 적용한다(서버 간 전달 순서 때문).
`self.permission`은 연결 시점에 DB로 다시 계산한 값이라 입장 응답보다 최신이다.

### `members:joined` `{ member: BoardMemberResponse }`

그 참여자의 첫 소켓일 때 다른 참여자에게. 탭이 여러 개여도 한 번이다.
서로 다른 서버에서 같은 참여자가 동시에 붙으면 두 번 올 수 있으므로 클라이언트는 `member.id`로 덮어쓴다.

### `members:left` `{ memberId: string }`

그 참여자의 마지막 소켓이 끊길 때. 서버가 비정상 종료되면 빠질 수 있다 → `members:sync`로 바로잡는다.

### `board:changed` (그림 결과를 바꾼 변경, 나 포함 방 전체)

```ts
| { seq, type: 'stroke', stroke: BoardStroke }
| { seq, type: 'hide',  opId, authorId, strokeId }
| { seq, type: 'show',  opId, authorId, stroke: BoardStroke }  // 숨겼던 획은 스냅샷에 없을 수 있어 획 전체를 싣는다
| { seq, type: 'clear', opId, authorId }                       // authorId의 seq보다 앞선 펜 획·own 지우개를 지운다
| { seq, type: 'merge', opId, from, to }                       // 게스트를 계정에 합침
```

종류를 이벤트로 나누지 않고 `type`으로 구분한다. 모르는 `type`도 `seq`는 진행해야 예전 클라이언트가 빈 번호로 오해하지 않는다.
재전송으로 같은 변경이 다시 올 수 있으므로 `seq`가 이미 적용한 번호 이하면 버린다.

### `stroke:preview` (그리는 중, 나를 뺀 방 전체, volatile)

`BoardStrokePreviewInput` + 서버가 넣은 `authorId`. 늦거나 빠질 수 있다.

---

## 4. 클라이언트 → 서버 (요청과 ack)

요청은 socket.io ack로 결과를 받는다(`socket.timeout(ms).emitWithAck(event, payload)`).

```ts
type BoardAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: 'BAD_REQUEST' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL'; retryable: boolean; message?: string } };
```

- 본문이 객체가 아니면 `BAD_REQUEST`. 서버 오류는 예외로 끊지 않고 `INTERNAL`(retryable)로 답한다.
- **쓰기 요청은 처리기마다 권한(`socket.data.permission`)을 확인**하고 없으면 `FORBIDDEN`. 연결할 때만 확인하면
  나중에 보기 전용(`VIEW`) 권한이 생겼을 때 뚫린다.
- 저장하는 요청은 **같은 ID로 다시 보내도 한 번만 반영**(멱등)되게 만든다. 클라이언트는 응답이 없으면 같은 ID로 다시 보낸다.

### `members:sync` `{}` → `{ members: BoardMemberResponse[] }`

모든 서버에 물어 지금 접속자 목록을 돌려준다. 클라이언트는 탭으로 돌아왔을 때(`visibilitychange`) 부르고,
요청 중에 입장·퇴장 이벤트를 받았으면 응답을 버린다(이벤트가 더 최신이다).

### 획 저장

| 이벤트 | 본문 | 응답 | 설명 |
| --- | --- | --- | --- |
| `stroke:commit` | `{ stroke: BoardStrokeInput }` | `{ seq }` | 같은 획 ID는 한 번만 저장. 범위 `all`은 소유자만(`FORBIDDEN`) |
| `stroke:hide` | `{ opId, strokeId }` | `{ seq \| null }` | 내 획만. 이미 숨겨져 있으면 `null`이고 순서를 쓰지 않는다 |
| `stroke:show` | `{ opId, strokeId }` | `{ seq \| null }` | 내 획만. 전체 지우기로 지운 획은 `FORBIDDEN` |
| `stroke:clear` | `{ opId }` | `{ seq }` | 내 펜 획·own 지우개를 숨긴다(삭제 아님) |
| `strokes:sync` | `{ sinceSeq }` | `{ changes, upToSeq, hasMore } \| { reset: true }` | `sinceSeq` 다음 변경. `reset`이면 스냅샷부터 다시 |
| `stroke:preview` | `BoardStrokePreviewInput` | 없음 | 저장하지 않고 중계. 잘못됐거나 너무 잦으면 버린다 |

`opId`와 획 ID는 클라이언트가 만든 UUID다. 같은 ID로 다시 보내면 첫 결과를 돌려주고 방에도 다시 보낸다
(첫 시도가 저장 뒤 방송 전에 실패했을 수 있다).

### REST 스냅샷 `GET /boards/:id/snapshot?cursor=`

헤더 `x-board-token`(입장 API의 보드 토큰, 게스트 포함). 응답 `{ lastSeq, strokes, nextCursor }`, `Cache-Control: no-store`.
지금 **보이는 획만** seq 순서로 200개씩 준다. 숨긴 획은 다시 실행될 때 `show` 변경에 실려 온다.

---

## 5. 획 동기화 설계

나중에 바꾸기 어려운 규칙 위주로 적는다. 구현은 `board-stroke.service.ts`, `board.gateway.ts`, 프론트 `StrokeSync.ts`.

### 5-0. 정책 결정 (2026-11-08)

- **실행 취소·다시 실행은 페이지(세션) 동안만.** 새로고침하면 기록이 사라진다(획은 남는다).
  동기화는 내 획 숨기기·보이기를 durable 작업(`seq` 부여)으로 보낸다. 새로고침 뒤 숨긴 획은 계속 숨긴 상태다.
- **전체 지우기는 "내 획 모두 숨기기" 작업 하나로 저장**한다(실제 삭제 아님). 화면에서는 되돌릴 수 없지만(시안),
  데이터는 남아 운영에서 롤백할 수 있다. 숨긴 획을 실제로 지우는 정리는 나중에 정한다.
- **동시 참여 인원 제한은 값으로 바꿀 수 있게.** 기본값은 서버 설정(예: env `BOARD_MAX_MEMBERS`, 지금 5),
  보드별로 바꿀 수 있게 `Board.maxMembers`(null이면 기본값)를 둔다. 입장 API와 소켓 연결에서 막고(새 연결 거절 코드 추가),
  값은 `hello.limits.maxMembers`로 내려준다. 프론트는 "꽉 찼어요" 화면. 같은 참여자의 탭 여러 개는 한 명으로 센다.
- **획 보관은 지금 무제한.** 메시지 크기·빈도 제한(5-4)은 서버 보호용이라 둔다. **보드를 지우면 획도 함께 지운다**(FK cascade).
- **소유자 지우개**: 입장 응답의 `isOwner`를 프론트 `canEraseAll`에 연결한다. 소유자의 지우개 획은 범위 `all`로 저장된다.
- **소유자는 인원 제한에서 제외한다.** 자기 보드에 못 들어가는 일을 막는다. 최대 인원+1명까지 될 수 있다.
- **회원이 탈퇴해도 획은 남긴다.** 다른 사람과 함께 그린 그림이다. `BoardMember.userId`가 `SetNull`되어
  `userId`·`name`이 모두 null인 익명 참여자로 남고, 그 행은 다시 입장에 쓸 수 없다.
  단 **보드 소유자가 탈퇴하면 지금은 보드 전체가 함께 지워진다**(`Board.owner` cascade).

### 5-1. 순서(`seq`)

- 서버가 보드마다 1부터 늘어나는 `seq`를 매긴다. 획·지우기·전체 지우기처럼 **그림 결과를 바꾸는 모든 변경**에 붙는다.
- 렌더링 결과가 순서에 따라 달라진다(지우개는 그 시점까지의 그림만 지운다). `createdAt`은 동시 입력·서버 간 시계 차이로
  뒤바뀔 수 있어 순서로 쓰지 않는다. **저장 첫날부터 있어야 한다**(나중에 복원 불가).
- 서버가 여러 대이므로 DB 한 곳에서 매긴다. `Board.lastSeq`를 `SELECT … FOR UPDATE`로 잠그고 → 같은 ID 확인 → 증가 → 저장을 한 트랜잭션에서 한다.
  같은 보드의 쓰기가 줄을 서므로 커밋 순서가 seq 순서와 같고, 재전송으로 번호가 비지 않는다. 방송은 커밋 뒤에 한다.

### 5-2. 처음 불러오기와 다시 연결

- 입장: 소켓을 먼저 연결해(`hello`) 변경을 모으기 시작하고, REST 스냅샷을 끝까지 받은 뒤 첫 페이지의 `lastSeq` 이후 변경을 적용한다.
  방에 들어간 뒤 `hello.seq`를 읽으므로 그 뒤 변경을 놓치지 않는다. 페이지 사이에 바뀐 것은 이 변경 적용으로 맞춰진다.
- 다시 연결: `hello.seq`가 마지막으로 적용한 seq보다 크면 `strokes:sync`로 빠진 변경만 받는다. 2,000개 넘게 뒤처졌으면 `reset`.
- 서버를 거치는 순서가 뒤바뀌는 건 정상이다. seq 순서대로만 적용하고, 빈 번호는 1초 기다린 뒤에도 비어 있을 때만 `strokes:sync`를 부른다.
- 응답의 `upToSeq`까지 적용한 것으로 본다. 그래서 DB에서 사라진 번호가 있어도 같은 요청을 반복하지 않는다.

### 5-3. 저장할 메시지와 흘려보낼 메시지

| 종류 | 예 | 저장 | `seq` | 전달 |
| --- | --- | --- | --- | --- |
| durable | `stroke:commit`(완성된 획), `stroke:clear`(전체 지우기) | O | O | ack 필수, 같은 획 ID 재전송은 한 번만 반영 |
| ephemeral | `stroke:preview`(그리는 중인 점), `presence:cursor` | X | X | volatile, 늦으면 버림. 서버는 검증 후 방에 중계만 |

그리는 중에는 preview로 다른 사람 화면에 실시간으로 보이고, 손을 떼면 commit이 확정한다.
commit이 거절되면 preview도 지운다.

### 5-4. 제한값 (`hello.limits`)

서버가 검사하고 값은 `hello.limits`로 내려준다. 출시 후 제한을 새로 걸면 기존 클라이언트가 갑자기 거절당하므로 처음부터 둔다.

| 키 | 값 | 설명 |
| --- | --- | --- |
| `maxMembers` | 보드별, 기본 5(`BOARD_MAX_MEMBERS`) | 동시 참여 인원 |
| `maxPointsPerStroke` | 11,000 | 넘으면 클라이언트가 이어지는 새 획으로 나눈다 |
| `maxStrokeBytes` | 524,288 | socket.io가 연결을 끊는 1MB보다 작게 |
| `maxPointsPerMessage` | 128 | `stroke:preview` 한 번의 점 개수 |
| `previewIntervalMs` | 50 | |
| `maxMessagesPerSecond` | 60 | 소켓별. 넘으면 `RATE_LIMITED`, preview는 버림 |
| `maxCoordinate` | 1,000,000 | x, y의 절댓값 |
| `maxStrokeSize` | 200 | 브러시 지름 |

### 5-5. 획 데이터 (나중에 마이그레이션으로 못 살리는 것)

- **원본 입력 그대로 저장**: 단순화·보정한 점, 계산된 굵기·dab 위치를 저장하지 않는다. 정밀도는 좌표 0.01px, 필압 소수 3자리, `t`·기울기 정수다(클라이언트가 입력 시점에 맞춘다).
- **입력 채널을 늘릴 수 있는 형식**: `channels`(`x`, `y`, `pressure`, `t`, `tiltX`, `tiltY` …) + 납작한 숫자 배열. 채널은 이름으로 읽고 모르는 채널은 건너뛴다.
  - `t`(획 시작부터 ms)와 펜 기울기는 지금부터 받는다. 재생·타임랩스·속도/기울기 브러시에 필요하고, 안 받으면 지난 획에는 영영 없다.
- **브러시 버전**: `brush: { id, version }`. 공개한 버전의 렌더링 동작은 바꾸지 않는다(바꾸면 지난 그림 모양이 바뀐다).
- **스키마 버전** `v`, **클라이언트가 만든 획 ID(UUID)**, 작성자 `BoardMember.id`.
- **지우기 = 지우개 획 추가**(원본을 지우지 않음). 범위 `own`/`all`을 획에 저장한다.

### 5-6. 나중에 기본값 마이그레이션으로 충분한 것

레이어(`layerId` — 보드마다 기본 레이어), 불투명도·흐름·블렌드(기본 1/1/normal = 지금 모습),
펜/지우개 타입 분리(`kind`), 색 형식 확장, 이동·회전(transform), 도형·텍스트·이미지 같은 새 요소.

### 5-7. 나중에 바꿔도 되는 것

전송 인코딩(JSON → msgpack/바이너리)은 규약 버전을 올려 바꾼다. 커서·반응 같은 새 기능은 이벤트 추가로 끝난다.
