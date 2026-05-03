# Admin API 문서

어드민 페이지 구현용 API 레퍼런스. 모든 어드민 라우트는 Swagger 에서 제외되어 있으므로 (`@ApiExcludeController`) 이 문서를 기준으로 작업한다.

- Base URL: 환경별 서버 주소 (예: `https://api.grimity.com`)
- 모든 응답은 JSON
- 모든 요청/응답 시간은 ISO 8601 (`2026-05-03T12:34:56.000Z`)
- UUID 는 v4 형식

---

## 인증

`POST /admin/login` 으로 받은 `accessToken` 을 모든 어드민 API 호출 시 헤더에 포함한다.

```
Authorization: Bearer <accessToken>
```

토큰이 없거나 만료/유효하지 않으면 모든 어드민 API 가 `401` 을 반환한다.

### `POST /admin/login`

어드민 로그인.

**Request Body**

| 필드       | 타입   | 필수 | 설명           |
| ---------- | ------ | ---- | -------------- |
| `id`       | string | ✅   | 어드민 ID      |
| `password` | string | ✅   | 어드민 password|

**Response 200**

```ts
{
  accessToken: string;  // JWT, 이후 모든 어드민 API 의 Bearer 토큰
}
```

**에러**

- `400` 유효성 검사 실패
- `401` id 또는 password 불일치

---

## 공통 사항

### Cursor 기반 페이지네이션

목록 조회 API 는 cursor 기반 페이지네이션을 사용한다.

- 첫 페이지: `cursor` 없이 호출
- 다음 페이지: 직전 응답의 `nextCursor` 값을 그대로 query 로 전달
- 마지막 페이지: `nextCursor` 가 `null`
- `size` 기본 20, 최대 50

cursor 형식: `${createdAtISO}_${id}` — 클라이언트는 이 값을 파싱하지 말고 그대로 다시 보내면 된다.

### 공통 에러 코드

| 코드  | 의미                         |
| ----- | ---------------------------- |
| `400` | 유효성 검사 실패             |
| `401` | 어드민 인증 실패             |
| `404` | 리소스 없음 (응답 message 에 `FEED` / `POST` / `COMMENT` 등으로 어떤 리소스가 없는지 표기) |
| `500` | `OFFICIAL_USER_ID` 환경변수 미설정 (공식계정 명의 작성 API 한정) |

### URL 필드

- `image`, `thumbnail` 응답 필드는 모두 **FULL URL** 로 내려간다 (서버에서 `IMAGE_URL` prefix 부착 완료). 클라이언트는 그대로 `<img src>` 에 넣으면 된다.
- `null` 인 경우 이미지 없음.

---

## 1. 피드 (Feed)

### `GET /admin/feeds` — 피드 목록 최신순

**Query**

| 필드     | 타입               | 기본 | 설명 |
| -------- | ------------------ | ---- | ---- |
| `cursor` | string             | -    | 없으면 처음부터 |
| `size`   | number (1~50)      | 20   | 페이지 크기 |

**Response 200**

```ts
{
  nextCursor: string | null;
  feeds: Array<{
    id: string;
    title: string;
    thumbnail: string;             // FULL URL
    createdAt: string;             // ISO
    viewCount: number;
    likeCount: number;
    commentCount: number;
    author: {
      id: string;
      name: string;
      image: string | null;        // FULL URL
      url: string;                 // 라우팅용
    };
  }>;
}
```

---

### `GET /admin/feeds/:id` — 피드 상세

**Path Param**

- `id` (UUID)

**Response 200**

```ts
{
  id: string;
  title: string;
  cards: string[];                 // FULL URL 배열
  thumbnail: string;               // FULL URL
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  content: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    image: string | null;
    url: string;
  };
  album: {                         // 앨범 미지정이면 null
    id: string;
    name: string;
  } | null;
}
```

**에러**

- `404` `FEED` — 존재하지 않는 피드

---

### `DELETE /admin/feeds/:id` — 피드 삭제

작성자 검증 없음. 좋아요/댓글/태그 등은 DB cascade 로 함께 삭제.

**Path Param**

- `id` (UUID)

**Response**

- `204` 성공
- `404` `FEED`

---

## 2. 피드 댓글 (Feed Comment)

### `GET /admin/feed-comments` — 피드 댓글 목록 최신순

전체 피드 댓글을 최신순으로 cursor 페이지네이션. 어떤 피드에 달린 댓글인지 기본 정보 포함.

**Query**

| 필드     | 타입          | 기본 | 설명 |
| -------- | ------------- | ---- | ---- |
| `cursor` | string        | -    | 없으면 처음부터 |
| `size`   | number (1~50) | 20   | 페이지 크기 |

**Response 200**

```ts
{
  nextCursor: string | null;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    parentId: string | null;       // 대댓글이면 부모 댓글 id, 일반 댓글이면 null
    writer: {
      id: string;
      name: string;
      url: string;
      image: string | null;        // FULL URL
    };
    feed: {                        // 어떤 피드의 댓글인지 기본 정보
      id: string;
      title: string;
      thumbnail: string | null;    // FULL URL
    };
  }>;
}
```

---

### `GET /admin/feed-comments/by-feed?feedId={uuid}` — 특정 피드의 댓글 트리 조회

피드 상세 페이지용. 부모 댓글 + `childComments` 트리. 시간 오름차순.

**Query**

| 필드     | 타입 | 필수 | 설명 |
| -------- | ---- | ---- | ---- |
| `feedId` | UUID | ✅   | 조회할 피드 id |

**Response 200**

```ts
Array<{
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  writer: {
    id: string;
    name: string;
    url: string;
    image: string | null;          // FULL URL
  };
  childComments: Array<{
    id: string;
    content: string;
    createdAt: string;
    likeCount: number;
    writer: { id, name, url, image };
    mentionedUser: { id, name, url, image } | null;
  }>;
}>;
```

게시글 댓글 트리와 다른 점: 피드 댓글은 hard delete 만 사용하므로 `isDeleted` 필드가 없고, `writer` 도 항상 non-null.

**에러**

- `404` `FEED` — 존재하지 않는 피드

---

### `POST /admin/feed-comments` — 공식계정 명의 댓글 생성

`writerId` 가 서버 환경변수 `OFFICIAL_USER_ID` 로 강제 고정된다. 댓글 종류에 따라 알림 (`notification:FEED_COMMENT` / `FEED_REPLY` / `FEED_MENTION`) 이 자동 발행된다.

**Request Body**

| 필드              | 타입            | 필수 | 설명 |
| ----------------- | --------------- | ---- | ---- |
| `feedId`          | UUID            | ✅   | 댓글 달 피드 id |
| `parentCommentId` | UUID            | ❌   | 대댓글이면 부모 댓글 id |
| `content`         | string (1~1000) | ✅   | 댓글 내용 |
| `mentionedUserId` | UUID            | ❌   | 멘션 대상 사용자 id (대댓글에서만 의미 있음) |

**Response**

- `201` (body 없음)
- `404` `FEED` 또는 `COMMENT` (피드/부모 댓글 없음)
- `500` `OFFICIAL_USER_ID_NOT_CONFIGURED`

---

### `DELETE /admin/feed-comments/:id` — 피드 댓글 삭제

작성자 검증 없음. Hard delete.

**Path Param**

- `id` (UUID)

**Response**

- `204`
- `404` `COMMENT`

---

## 3. 게시글 (Post)

### `GET /admin/posts` — 게시글 목록 최신순

**Query**

| 필드     | 타입                                                          | 기본    | 설명 |
| -------- | ------------------------------------------------------------- | ------- | ---- |
| `cursor` | string                                                        | -       | 없으면 처음부터 |
| `size`   | number (1~50)                                                 | 20      | 페이지 크기 |
| `type`   | `'NORMAL' \| 'QUESTION' \| 'FEEDBACK' \| 'NOTICE' \| 'ALL'`   | `'ALL'` | 게시글 타입 필터. `'ALL'` 은 공지 포함 전체 |

**Response 200**

```ts
{
  nextCursor: string | null;
  posts: Array<{
    id: string;
    type: 'NORMAL' | 'QUESTION' | 'FEEDBACK' | 'NOTICE';
    title: string;
    thumbnail: string | null;      // FULL URL
    createdAt: string;
    viewCount: number;
    commentCount: number;
    author: {
      id: string;
      name: string;
      url: string;
      image: string | null;        // FULL URL
    };
  }>;
}
```

---

### `GET /admin/posts/:id` — 게시글 상세

**Path Param**

- `id` (UUID)

**Response 200**

```ts
{
  id: string;
  type: 'NORMAL' | 'QUESTION' | 'FEEDBACK' | 'NOTICE';
  title: string;
  content: string;                 // HTML 원문
  thumbnail: string | null;        // FULL URL
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  author: {
    id: string;
    name: string;
    url: string;
    image: string | null;
  };
}
```

**에러**

- `404` `POST`

---

### `DELETE /admin/posts/:id` — 게시글 삭제

작성자 검증 없음. 댓글/좋아요/저장 등은 DB cascade 로 함께 삭제.

**Path Param**

- `id` (UUID)

**Response**

- `204`
- `404` `POST`

---

## 4. 게시글 댓글 (Post Comment)

### `GET /admin/post-comments?postId={uuid}` — 특정 게시글의 댓글 트리 조회

**Query**

| 필드     | 타입 | 필수 | 설명 |
| -------- | ---- | ---- | ---- |
| `postId` | UUID | ✅   | 조회할 게시글 id |

**Response 200**

부모 댓글 + `childComments` 트리. 시간 오름차순.

```ts
Array<{
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isDeleted: boolean;              // 소프트 삭제된 부모 댓글이면 true (스레드 유지용)
  writer: {
    id: string;
    name: string;
    url: string;
    image: string | null;
  } | null;                        // null = 익명화된 (소프트 삭제된) 댓글
  childComments: Array<{
    id: string;
    content: string;
    createdAt: string;
    likeCount: number;
    writer: { id, name, url, image } | null;
    mentionedUser: { id, name, url, image } | null;
  }>;
}>;
```

---

### `POST /admin/post-comments` — 공식계정 명의 게시글 댓글 생성

`writerId` 가 서버 환경변수 `OFFICIAL_USER_ID` 로 강제 고정된다. 댓글 종류에 따라 알림 (`notification:POST_COMMENT` / `POST_REPLY` / `POST_MENTION`) 이 자동 발행된다. 트랜잭션으로 `Post.commentCount + 1`.

**Request Body**

| 필드              | 타입            | 필수 | 설명 |
| ----------------- | --------------- | ---- | ---- |
| `postId`          | UUID            | ✅   | 댓글 달 게시글 id |
| `parentCommentId` | UUID            | ❌   | 대댓글이면 부모 댓글 id |
| `content`         | string (1~1000) | ✅   | 댓글 내용 |
| `mentionedUserId` | UUID            | ❌   | 멘션 대상 사용자 id (대댓글에서만 의미 있음) |

**Response**

- `201` (body 없음)
- `404` `POST` 또는 `COMMENT`
- `500` `OFFICIAL_USER_ID_NOT_CONFIGURED`

---

### `DELETE /admin/post-comments/:id` — 게시글 댓글 삭제

작성자 검증 없음. 스레드 보존을 위해 일반 사용자와 동일한 삭제 로직 적용:

- 부모 댓글 + 자식 0개 → hard delete
- 부모 댓글 + 자식 ≥ 1 → 소프트 삭제 (`isDeleted=true`, `content=''`, `writerId=null`) — 자식 노출 유지
- 자식 댓글 + 부모가 소프트삭제 상태 + 마지막 자식 → 자식 + 부모 둘 다 hard delete (스레드 정리)
- 그 외 자식 댓글 → hard delete

`Post.commentCount` 는 항상 1 감소.

**Response**

- `204`
- `404` `COMMENT`

---

## 5. 공지사항 (Notice)

`type=NOTICE` 인 Post 를 `OFFICIAL_USER_ID` 명의로 생성한다. 생성된 공지는 일반 사용자 API `GET /posts/notices` 에 자동 노출된다. 어드민에서 공지를 조회/삭제하려면 위 게시글 API (`GET /admin/posts?type=NOTICE`, `DELETE /admin/posts/:id`) 를 사용한다.

### `POST /admin/notices` — 공지사항 생성

**Request Body**

| 필드      | 타입             | 필수 | 설명 |
| --------- | ---------------- | ---- | ---- |
| `title`   | string (1~32)    | ✅   | 공지 제목 |
| `content` | string (1~)      | ✅   | HTML 본문. 첫 `<img src>` 가 자동으로 thumbnail 로 추출됨 |

**Response 201**

```ts
{
  id: string;                      // 생성된 공지 (Post) id
}
```

**에러**

- `400` 유효성 실패 또는 본문(HTML 제거 후) 길이 0
- `500` `OFFICIAL_USER_ID_NOT_CONFIGURED`

---

## 엔드포인트 요약 표

| Method | Path                          | 설명 |
| ------ | ----------------------------- | ---- |
| POST   | `/admin/login`                | 어드민 로그인 |
| GET    | `/admin/feeds`                | 피드 목록 (최신순, cursor) |
| GET    | `/admin/feeds/:id`            | 피드 상세 |
| DELETE | `/admin/feeds/:id`            | 피드 삭제 |
| GET    | `/admin/feed-comments`        | 피드 댓글 목록 (최신순, cursor) |
| GET    | `/admin/feed-comments/by-feed`| 특정 피드의 댓글 트리 조회 (feedId 필수) |
| POST   | `/admin/feed-comments`        | 공식계정 명의 피드 댓글 생성 |
| DELETE | `/admin/feed-comments/:id`    | 피드 댓글 삭제 |
| GET    | `/admin/posts`                | 게시글 목록 (최신순, cursor + type 필터) |
| GET    | `/admin/posts/:id`            | 게시글 상세 |
| DELETE | `/admin/posts/:id`            | 게시글 삭제 |
| GET    | `/admin/post-comments`        | 게시글 댓글 트리 조회 (postId 필수) |
| POST   | `/admin/post-comments`        | 공식계정 명의 게시글 댓글 생성 |
| DELETE | `/admin/post-comments/:id`    | 게시글 댓글 삭제 |
| POST   | `/admin/notices`              | 공지사항 생성 (`type=NOTICE` Post) |
