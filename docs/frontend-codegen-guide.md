# 프론트엔드 OpenAPI codegen 적용 가이드

서버가 `openapi/openapi.json`을 커밋하기 시작했다. 이 문서는 프론트(FE-Grimity)가
손으로 쓰던 API 레이어를 **생성된 클라이언트**로 바꾸는 전 과정을 다룬다.

- 대상: FE-Grimity (Next.js 15 Pages Router, axios, TanStack Query v5)
- 같은 방식이 admin-web에도 그대로 적용된다. Flutter(APP-Grimity)는 생성기만 다르다(부록 D).

---

## 0. 세 줄 요약

1. `orval` 하나 설치하고 설정 파일 2개(`orval.config.ts`, 커스텀 mutator) 만들면 끝난다.
2. 기존 `axiosInstance`(토큰 주입·401 refresh 인터셉터)는 **그대로 재사용**된다. 건드릴 필요 없다.
3. 진짜 손이 가는 건 코드 생성이 아니라 **쿼리키 34곳 교체**다. 여기가 유일한 위험 구간이다.

**난이도: 중하.** 도메인 단위로 쪼개면 각 도메인은 반나절. 한 번에 다 하려 들면 위험하다.

---

## 1. 무엇이 어떻게 달라지나

### 지금 (손으로 씀)

```ts
// src/api/posts/getPosts.ts
import type { PostsResponse, PostResponse } from "@grimity/dto";

export async function getPostsNotices(): Promise<PostResponse[]> {
  try {
    const response = await axiosInstance.get("/posts/notices");
    return response.data;
  } catch (error) {
    console.error("Error fetching postsNotices:", error);
    throw new Error("Failed to fetch postsNotices");
  }
}

export const usePostsNotices = () => {
  return useQuery<PostResponse[]>({
    queryKey: ["postsNotices"],
    queryFn: () => getPostsNotices(),
    staleTime: 5 * 60 * 1000,
  });
};
```

**이 코드 자체는 잘못되지 않았다.** 설치된 `@grimity/dto` 1.0.24 기준으로 `PostResponse`에는
`author`가 포함돼 있어서 당시엔 정확했다.

문제는 그 뒤 서버에서 일어난 일이다. 커밋 `a0b0e47`(2025-12-03, "refactor: dto 타입
base.response 분리")에서 `PostResponse`가 쪼개지며 **`author`가 빠지고** 새 타입
`PostWithAuthorResponse`가 생겼다. 즉 **`PostResponse`라는 이름의 의미가 버전 간에 조용히
바뀌었다.**

- 서버 현재(1.0.34): `PostResponse` = author **없음**
- 웹 설치본(1.0.24): `PostResponse` = author **있음**

지금은 웹이 옛 버전에 고정돼 있어 동작에 문제가 없다. 하지만 `@grimity/dto`를 올리는 순간
`PostResponse`가 다른 의미가 되면서 코드가 깨진다. 컴파일러는 "이름이 같으니 괜찮다"고
판단하기 때문에 **타입 이름만 공유하는 방식으로는 이런 계약 변경을 잡아낼 수 없다.**
이게 codegen으로 옮기려는 핵심 이유다.

### 앞으로 (생성됨)

```ts
// 자동 생성 — 직접 수정하지 않는다
export const postGetNotices = (signal?: AbortSignal) => {
  return customAxios<PostWithAuthorResponse[]>({
    url: `/posts/notices`, method: 'GET', signal
  });
}

export function usePostGetNotices<
  TData = Awaited<ReturnType<typeof postGetNotices>>,
  TError = ErrorResponse
>(options?: { query?: UseQueryOptions<...> }): UseQueryResult<TData, TError> & { queryKey: QueryKey }
```

URL·HTTP 메서드·요청 타입·응답 타입·에러 타입이 **한 덩어리로** 생성된다. 서버가 타입을
쪼개거나 이름의 의미를 바꾸면 재생성 시 diff로 즉시 드러나고, 반영하지 않으면 컴파일이
실패한다. 위와 같은 무성(無聲) 계약 변경이 구조적으로 불가능해진다.

### 자동으로 고쳐지는 것들

| 항목 | 지금 | 이후 |
|---|---|---|
| `createdAt` | `Date`로 선언되지만 실제론 문자열이 옴 (그래서 곳곳에서 `createdAt: string`으로 재선언 중) | `string` — 스펙의 `format: date-time` 기준 |
| 에러 바디 | 타입 없음 | `ErrorResponse { statusCode, message, error? }` |
| 타입 이름의 의미 변화 | 서버가 `PostResponse`에서 author를 빼도 구버전 고정이라 모름 | 재생성 diff로 드러나고, 미반영 시 컴파일 실패 |
| enum | `"ALL" \| "QUESTION" \| "FEEDBACK"` 하드코딩 | 스펙에서 생성 |
| 버전 동기화 | `@grimity/dto` 수동 publish/install (현재 설치본 1.0.24 vs 서버 1.0.34) | 스펙 파일 하나 |

---

## 2. 사전 준비

### 2-1. 스펙을 어디서 가져올까

서버 레포(`github.com/Grimity/server`)는 **public**이라 인증 없이 받을 수 있다.

| 방식 | 값 | 언제 쓰나 |
|---|---|---|
| **커밋된 파일 (권장)** | `https://raw.githubusercontent.com/Grimity/server/dev/openapi/openapi.json` | 기본. 서버 커밋과 1:1로 대응해서 재현 가능 |
| 로컬 경로 | `../server/openapi/openapi.json` | 서버·프론트를 같이 띄워놓고 작업할 때 |
| 라이브 서버 | `https://api-dev.grimity.com/api-json` | dev 서버에 갓 배포된 변경을 급히 확인할 때 |

라이브 URL은 "지금 dev에 떠 있는 것"이라 커밋과 어긋날 수 있다. 기본은 커밋된 파일을 쓴다.

> 주의: `openapi.json`은 서버 PR에서 CI(`openapi:check`)가 소스와 일치하는지 검사하므로
> 항상 최신이다. 서버 API가 바뀌면 이 파일도 같은 PR에 포함된다.

### 2-2. 설치

```bash
cd FE-Grimity
npm i -D orval
```

끝이다. 런타임 의존성은 추가되지 않는다(이미 있는 axios와 @tanstack/react-query만 씀).

---

## 3. 설정 파일 2개

### 3-1. 커스텀 mutator — `src/api/generated/customAxios.ts`

**이게 이번 작업에서 제일 중요한 파일이다.** 생성된 함수가 axios를 직접 쓰지 않고 이 함수를
거치게 만들어서, 기존 `axiosInstance`의 인터셉터를 전부 그대로 살린다.

```ts
import axiosInstance from "@/constants/baseurl";
import type { AxiosRequestConfig } from "axios";

/**
 * orval이 생성한 모든 API 함수가 이 함수를 통해 요청한다.
 * 기존 axiosInstance를 그대로 쓰므로 아래가 전부 유지된다.
 *  - 요청: Bearer 토큰 자동 주입, exclude-access-token 헤더 처리
 *  - 응답: 401 → refresh 후 재시도, is-delete-account 처리
 * 또한 response.data를 벗겨서 반환하므로 호출부는 지금과 동일하게 쓰면 된다.
 */
export const customAxios = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await axiosInstance(config);
  return data;
};

export default customAxios;
```

이 mutator를 쓰면 생성 함수의 반환 타입이 `AxiosResponse<T>`가 아니라 **`T`로 바로 나온다.**
지금 프론트가 `return response.data` 하던 것과 형태가 같아서 호출부 수정이 최소화된다.

### 3-2. `orval.config.ts` (프로젝트 루트)

```ts
import { defineConfig } from "orval";

export default defineConfig({
  grimity: {
    input: {
      target: "https://raw.githubusercontent.com/Grimity/server/dev/openapi/openapi.json",
    },
    output: {
      mode: "tags-split",              // 태그(posts, feeds, me...)별로 파일 분리
      target: "src/api/generated/api.ts",
      schemas: "src/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      clean: true,                     // 삭제된 엔드포인트의 잔재를 남기지 않음
      prettier: true,
      override: {
        mutator: {
          path: "src/api/generated/customAxios.ts",
          name: "customAxios",
        },
      },
    },
  },
});
```

### 3-3. npm script

```json
{
  "scripts": {
    "api:gen": "orval",
    "api:check": "orval && git diff --exit-code -- src/api/generated"
  }
}
```

`api:check`를 CI에 넣어두면 "서버 스펙은 바뀌었는데 프론트는 재생성을 안 한" 상태를 잡아준다.

### 3-4. 생성 결과물은 커밋한다

`src/api/generated/`를 gitignore 하지 말고 **커밋한다.**
- PR diff에서 서버 계약 변경이 눈에 보인다 (breaking change 리뷰가 공짜로 됨)
- CI/빌드 환경이 스펙 URL에 네트워크로 접근하지 않아도 된다
- 다만 리뷰할 때 생성 파일은 `.gitattributes`에 `linguist-generated=true`로 표시해두면 편하다

---

## 4. 실행

```bash
npm run api:gen
```

만들어지는 구조 (태그 17개 기준, 실제로 생성해서 확인한 결과):

```
src/api/generated/
├── customAxios.ts        ← 직접 작성 (위 3-1)
├── albums/albums.ts
├── auth/auth.ts
├── chat-messages/chat-messages.ts
├── chats/chats.ts
├── feed-comments/feed-comments.ts
├── feeds/feeds.ts
├── images/images.ts
├── me/me.ts
├── notifications/notifications.ts
├── post-comments/post-comments.ts
├── posts/posts.ts
├── reports/reports.ts
├── tags/tags.ts
├── users/users.ts
├── commissions/, commission-works/, app/
└── model/                ← 응답·요청 타입 (약 123개)
```

각 태그 파일에는 엔드포인트마다 아래 4개가 생성된다.

| 생성물 | 예시 | 용도 |
|---|---|---|
| 요청 함수 | `postGetPost(id)` | SSR·이벤트 핸들러 등 훅 밖에서 호출 |
| 쿼리키 함수 | `getPostGetPostQueryKey(id)` | 무효화·prefetch |
| 옵션 함수 | `getPostGetPostQueryOptions(id, opts)` | `prefetchQuery`에 그대로 투입 |
| 훅 | `usePostGetPost(id, opts)` | 컴포넌트에서 사용 |

---

## 5. 도메인 하나 이관하기 (posts 예시)

**한 번에 전부 바꾸지 말고 도메인 단위로 간다.** 기존 `@grimity/dto`와 손으로 쓴 api 레이어는
그대로 살아 있으므로, 두 방식이 공존해도 아무 문제 없다.

### 5-1. 조회(Query)

```ts
// Before — src/api/posts/getPosts.ts
const { data } = usePostsLatest({ size: 10, page: 1, type: "ALL" });

// After
import { usePostGetPosts } from "@/api/generated/posts/posts";

const { data } = usePostGetPosts(
  { size: 10, page: 1, type: "ALL" },
  {
    query: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
);
```

지금 훅마다 손으로 넣어둔 react-query 옵션은 **두 번째 인자 `query`로 그대로 넘어간다.**
매번 쓰기 귀찮으면 두 가지 방법이 있다.

1. `QueryClient`의 `defaultOptions`로 올린다 (권장 — 대부분 값이 동일하다)
2. orval 설정에서 기본값을 박는다:
   ```ts
   override: {
     query: { useQuery: true, options: { staleTime: 5 * 60 * 1000 } },
   }
   ```

### 5-2. 변경(Mutation)

```ts
// After
import { usePostCreate } from "@/api/generated/posts/posts";

const { mutate } = usePostCreate({
  mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/posts"] }),
  },
});

mutate({ data: { title, content, type: "QUESTION" } });
```

인자가 `{ data: ... }`로 한 겹 감싸진다는 점만 주의한다. 경로 파라미터가 있으면
`mutate({ id, data: {...} })` 형태가 된다.

### 5-3. 무한 스크롤

`useInfiniteQuery`가 필요한 커서 기반 엔드포인트(`/me/like-feeds` 등)는 orval 설정에서
따로 켜야 한다.

서버가 커서 방식(`cursor`/`nextCursor`)과 페이지 방식(`page`/`size`)을 섞어 쓰므로,
전역으로 켜지 말고 **operationId별로 지정**한다. (아래 설정은 실제로 생성해서 동작 확인함)

```ts
override: {
  mutator: { path: "src/api/generated/customAxios.ts", name: "customAxios" },
  operations: {
    // 키는 스펙의 operationId (생성 함수명이 아니라 snake 형태)
    me_getMyLikeFeeds: { query: { useInfinite: true, useInfiniteQueryParam: "cursor" } },
    post_getPosts:     { query: { useInfinite: true, useInfiniteQueryParam: "page" } },
  },
}
```

생성되는 훅에는 **`Infinite` 접미사가 붙는다.**

```ts
useMeGetMyLikeFeedsInfinite(...)   // 무한 스크롤용
useMeGetMyLikeFeeds(...)           // 일반 훅도 그대로 같이 생성됨
```

---

## 6. ⚠️ 가장 위험한 구간 — 쿼리키

이 작업에서 조용히 깨질 수 있는 유일한 지점이다. **반드시 도메인과 같은 커밋에서 함께 바꾼다.**

생성된 쿼리키는 URL 기반이다.

```ts
["myInfo"]                  →  ["/me"]
["feedsLatest"]             →  ["/feeds/latest", params]
["details", id]             →  [`/feeds/${id}`]
["postsNotices"]            →  ["/posts/notices"]
```

현재 FE-Grimity에는 다음이 있다.

- `invalidateQueries` **27곳**
- `setQueryData` / `getQueryData` **7곳**

`invalidateQueries({ queryKey: ["myInfo"] })`는 키가 안 맞아도 **에러가 나지 않는다.**
그냥 아무것도 무효화하지 않고 조용히 지나간다. 화면이 갱신 안 되는 버그로만 드러난다.

### 안전하게 바꾸는 법

문자열 리터럴을 쓰지 말고 **생성된 쿼리키 함수를 쓴다.**

```ts
import { getMeGetMeQueryKey } from "@/api/generated/me/me";

queryClient.invalidateQueries({ queryKey: getMeGetMeQueryKey() });
```

이러면 나중에 URL이 바뀌어도 자동으로 따라간다. 도메인을 이관할 때마다 해당 도메인의
`invalidateQueries` / `setQueryData`를 전수 검색해서 같이 교체한다.

```bash
# 이관 전 해당 도메인 캐시 조작 지점 확인
grep -rn "invalidateQueries\|setQueryData\|getQueryData" src | grep -i "post"
```

---

## 7. 에러 처리 관습 옮기기

지금은 api 함수마다 try/catch로 이런 걸 하고 있다.

```ts
if (axios.isAxiosError(error) && error.response?.status === 404) {
  throw new Error("DELETED_POST");
}
```

생성 함수에는 이런 개별 catch를 넣을 수 없다. 두 가지 방법 중 고른다.

**방법 A — mutator에서 공통 처리 (권장)**

```ts
export const customAxios = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const { data } = await axiosInstance(config);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new NotFoundError(config.url);   // 도메인 에러로 승격
    }
    throw error;
  }
};
```

한 곳에서 처리되니 지금처럼 파일마다 복붙할 필요가 없다.

**방법 B — 호출부에서 처리**

```ts
const { data, error } = usePostGetPost(id);
if (error?.statusCode === 404) { /* ... */ }
```

에러가 `ErrorResponse` 타입으로 잡히므로 `statusCode`·`message`에 타입 안전하게 접근된다.
(서버가 모든 에러를 `{ statusCode, message, error? }` 형태로 내려주도록 스펙에 명시해 둠)

---

## 8. SSR / getServerSideProps

훅이 아니라 요청 함수를 그대로 쓴다.

```ts
import { postGetMeta } from "@/api/generated/posts/posts";

export const getServerSideProps = async ({ params }) => {
  const post = await postGetMeta(params.id as string);
  return { props: { post } };
};
```

주의: 현재 SSR 코드 일부는 `axiosInstance`가 아니라 `axios.get(`${baseUrl}/...`)`를 직접 쓰면서
`localStorage`에서 토큰을 읽는다. 서버 사이드에는 `localStorage`가 없으므로 이 부분은
이관하면서 정리 대상이다. mutator가 항상 `axiosInstance`를 타므로 SSR에서 토큰이 필요하면
`options.headers`로 명시적으로 넘겨야 한다.

prefetch가 필요하면 옵션 함수를 그대로 쓴다.

```ts
await queryClient.prefetchQuery(getPostGetPostQueryOptions(id));
```

---

## 9. 이관 순서 (권장)

| 순서 | 도메인 | 이유 |
|---|---|---|
| 1 | **posts** | 엔드포인트 수가 적당하고 SSR·무한스크롤·뮤테이션이 다 들어 있어 패턴 확정에 좋다 |
| 2 | notifications, tags, reports | 단순 조회 위주라 빠르게 넘어간다 |
| 3 | albums, post-comments, feed-comments | 캐시 조작이 얽혀 있다 |
| 4 | feeds, me, users | 가장 크고 쿼리키 의존이 많다. 패턴이 굳은 뒤에 |
| 5 | chats, chat-messages | WebSocket과 함께 봐야 한다 (10절) |

각 도메인 이관 = ①생성 훅으로 교체 → ②쿼리키 교체 → ③기존 `src/api/<도메인>/` 삭제 →
④`npx tsc --noEmit`으로 전체 타입 확인 → ⑤QA.

---

## 10. `@grimity/dto`는 언제 지우나

**지금 지우면 안 된다.** 아래 두 가지 때문이다.

1. 아직 이관 안 된 도메인이 이 패키지를 쓰고 있다 (현재 61개 파일이 import 중)
2. **WebSocket 이벤트 페이로드는 OpenAPI 범위 밖이다.** `newChatMessage`, `newNotification`,
   `deleteChat`, `likeChatMessage`, `unlikeChatMessage` 같은 socket.io 이벤트의 타입은
   codegen이 만들어주지 않는다.

따라서 순서는 이렇게 된다.

```
전체 도메인 이관 완료
  → @grimity/dto import가 WebSocket 관련 타입만 남음
  → 그때 패키지를 "WS 이벤트 타입 전용"으로 축소하거나 AsyncAPI 도입 검토
```

REST가 전부 넘어가기 전까지는 두 방식이 공존한다. 정상이다.

---

## 부록 A. 기존 함수 → 생성 함수 매핑 (71개 전수)

현재 `src/api/`의 모든 axios 호출을 스펙과 대조해 만든 표다. 누락 없이 전부 매핑된다.

| HTTP | 경로 | 지금 함수 | 생성 함수 |
|---|---|---|---|
| GET | /posts | `getPostsLatest` | `postGetPosts` |
| GET | /posts/{id} | `getPostsDetails` | `postGetPost` |
| GET | /posts/{id}/meta | `getSSRPostsDetails` | `postGetMeta` |
| GET | /posts/notices | `getPostsNotices` | `postGetNotices` |
| GET | /posts/search | `getPostSearch` | `postSearchPosts` |
| POST | /posts | `postPosts` | `postCreate` |
| PUT | /posts/{id} | `putEditPosts` | `postUpdate` |
| DELETE | /posts/{id} | `deletePostsFeeds` | `postDelete` |
| PUT | /posts/{id}/like | `putPostsLike` | `postLike` |
| DELETE | /posts/{id}/like | `deletePostsLike` | `postUnlike` |
| PUT | /posts/{id}/save | `putPostsSave` | `postSave` |
| DELETE | /posts/{id}/save | `deletePostsSave` | `postUnsave` |
| GET | /feeds/latest | `getFeedsLatest` | `feedGetFeeds` |
| GET | /feeds/{id} | `getDetails` | `feedGetFeed` |
| GET | /feeds/{id}/meta | `getSSRDetails` | `feedGetFeedMeta` |
| GET | /feeds/{id}/like | `getFeedsLike` | `feedGetLikeUsers` |
| GET | /feeds/following | `getFollowingFeeds` | `feedGetFollowingFeeds` |
| GET | /feeds/rankings | `getRankings` | `feedGetFeedRanks` |
| GET | /feeds/search | `getFeedSearch` | `feedSearch` |
| PUT | /feeds/{id} | `putEditFeeds` | `feedUpdate` |
| DELETE | /feeds/{id} | `deleteFeeds` | `feedDelete` |
| POST | /feeds/batch-delete | `deleteBatchFeeds` | `feedDeleteMany` |
| PUT | /feeds/{id}/like | `putFeedsLike` | `feedLike` |
| DELETE | /feeds/{id}/like | `deleteFeedsLike` | `feedUnlike` |
| PUT | /feeds/{id}/save | `putSave` | `feedSave` |
| DELETE | /feeds/{id}/save | `deleteSave` | `feedUnsave` |
| PUT | /feeds/{id}/view | `putView` | `feedView` |
| GET | /me | `getMyInfo` | `meGetMe` |
| PUT | /me | `putMyInfo` | `meUpdateProfile` |
| DELETE | /me | `deleteMe` | `meDeleteUser` |
| GET | /me/followers | `getMyFollower` | `meGetMyFollowers` |
| DELETE | /me/followers/{id} | `deleteMyFollowers` | `meDeleteMyFollower` |
| GET | /me/followings | `getMyFollowing` | `meGetMyFollowings` |
| GET | /me/like-feeds | `getMyLikeList` | `meGetMyLikeFeeds` |
| GET | /me/save-feeds | `getMySaveList` | `meGetMySaveFeeds` |
| GET | /me/save-posts | `getMySavePost` | `meGetMySavePosts` |
| GET | /me/subscribe | `getSubscribe` | `meGetSubscriptions` |
| PUT | /me/subscribe | `putSubscribe` | `meUpdateSubscriptions` |
| PUT | /me/image | `putProfileImage` | `meUpdateProfileImage` |
| DELETE | /me/image | `deleteMyProfileImage` | `meDeleteProfileImage` |
| PUT | /me/background | `putBackgroundImage` | `meUpdateBackgroundImage` |
| DELETE | /me/background | `deleteMyBackgroundImage` | `meDeleteBackgroundImage` |
| GET | /users/{id} | `getUserInfo` | `userGetUserById` |
| GET | /users/{id}/posts | `getUserPosts` | `userGetPosts` |
| GET | /users/popular | `getPopular` | `userGetPopularUsers` |
| GET | /users/profile/{url} | `getUserInfoByUrl` | `userGetProfileByUrl` |
| GET | /users/profile/{url}/meta | `getSSRUserInfoByUrl` | `userGetMetaByUrl` |
| GET | /users/search | `getUserSearch` | `userSearchUser` |
| PUT | /users/{id}/follow | `putFollow` | `userFollow` |
| DELETE | /users/{id}/follow | `deleteFollow` | `userUnfollow` |
| GET | /notifications | `getNotifications` | `notificationGetAll` |
| PUT | /notifications | `putNotifications` | `notificationReadAll` |
| PUT | /notifications/{id} | `putNotificationsId` | `notificationRead` |
| DELETE | /notifications | `deleteNotifications` | `notificationDeleteAll` |
| DELETE | /notifications/{id} | `deleteNotificationsId` | `notificationDelete` |
| POST | /albums | `createAlbums` | `albumUpdate` ⚠️ |
| PATCH | /albums/{id} | `patchAlbums` | `albumUpdateOne` |
| DELETE | /albums/{id} | `deleteAlbums` | `albumDeleteOne` |
| PUT | /albums/{id} | `putFeedsInAlbums` | `albumInsertFeeds` |
| PUT | /albums/null | `putFeedsNull` | `albumRemoveFeeds` |
| PUT | /albums/order | `putAlbumsOrder` | `albumUpdateOrder` |
| POST | /feed-comments | `postFeedsComments` | `feedCommentCreate` |
| DELETE | /feed-comments/{id} | `deleteComments` | `feedCommentDeleteOne` |
| PUT | /feed-comments/{id}/like | `putCommentLike` | `feedCommentLike` |
| DELETE | /feed-comments/{id}/like | `deleteCommentLike` | `feedCommentUnlike` |
| POST | /post-comments | `postPostsComments` | `postCommentCreatePostComment` |
| DELETE | /post-comments/{id} | `deletePostsComments` | `postCommentDeletePostComment` |
| PUT | /post-comments/{id}/like | `putPostsCommentLike` | `postCommentLikePostComment` |
| DELETE | /post-comments/{id}/like | `deletePostsCommentLike` | `postCommentUnlikePostComment` |
| GET | /tags/popular | `getTagsPopular` | `tagFindPopularTags` |
| POST | /reports | `postReports` | `reportCreate` |

⚠️ `POST /albums`(앨범 생성)이 서버 쪽 메서드명이 `update()`라서 생성 함수가 `albumUpdate`로
나온다. 이름이 오해를 부르므로 **서버에서 메서드명을 `create`로 바꾸는 게 맞다.** 이관 시작 전에
백엔드에 요청할 것 (바꾸면 생성 함수는 `albumCreate`가 된다).

---

## 부록 B. 함정 모음

| 함정 | 증상 | 대응 |
|---|---|---|
| **쿼리키 불일치** | 에러 없이 화면만 갱신 안 됨 | 생성된 `get*QueryKey()` 함수를 쓴다 (6절) |
| **operationId 변경** | 재생성 후 함수명이 통째로 바뀜 | 서버가 컨트롤러 **클래스명·메서드명**을 바꾸면 발생. 서버 PR 리뷰 때 확인 |
| mutation 인자 형태 | `mutate(dto)`가 타입 에러 | `mutate({ data: dto })`로 감싼다 |
| `AxiosResponse` 래핑 | `data.data`로 접근하게 됨 | mutator를 쓰면 이미 벗겨져 있다. 3-1을 반드시 적용 |
| SSR에서 `localStorage` | 서버에서 터짐 | 8절 참고 |
| 생성 폴더를 수정 | 재생성하면 날아감 | 감싸는 래퍼를 따로 만든다 |
| commissions 도메인 | 스펙에 있는데 프론트에 없음 | 신규 기능. 이관이 아니라 **처음부터 생성 클라이언트로** 시작하기 좋은 후보 |

---

## 부록 C. 스펙에 없는 것

- **admin API** — 서버에서 `@ApiExcludeController`로 제외돼 있어 스펙에 없다. admin-web은
  당분간 지금 방식을 유지한다. 필요해지면 백엔드에 별도 admin 스펙을 요청한다.
- **WebSocket 이벤트** — 10절 참고.
- **204 응답 본문** — 정상이다. 서버가 실제로 본문을 안 주는 엔드포인트다.

---

## 부록 D. Flutter(APP-Grimity)

**Flutter도 동일하게 적용 가능하다. 오히려 절감 효과가 가장 크다** — 현재 수기로 관리 중인
모델 68개 + retrofit 인터페이스 17개가 통째로 생성물로 대체된다.

아래 내용은 실제로 생성 → `build_runner` → `dart analyze`까지 돌려서 검증했다.
(Dart 3.9.2 / swagger_parser 1.44.0 / 앱과 동일한 의존성 버전 기준)

```
17 rest clients, 118 requests, 197 data classes → 216 files
build_runner: 403 outputs 성공
dart analyze: 에러 0건
```

### D-1. ⚠️ `use_freezed3: true`가 필수다

이 옵션 없이 생성하면 **컴파일 에러 123개**가 난다. swagger_parser는 기본적으로 freezed 2.x
스타일(`class X with _$X`)로 생성하는데, 앱은 freezed 3.2.3을 쓰고 있고 freezed 3.x는
`abstract class`를 요구하기 때문이다.

```
error - Missing concrete implementations of 'getter mixin _$PostBaseResponse on Object.id' ...
        Try implementing the missing methods, or make the class abstract.
```

`use_freezed3: true`를 켜면 `abstract class`로 생성되고 에러가 0이 된다.

### D-2. 설정

```yaml
# pubspec.yaml (dev_dependencies)
swagger_parser: ^1.44.0
```

```yaml
# swagger_parser.yaml (프로젝트 루트)
swagger_parser:
  schema_path: openapi.json          # 또는 서버 레포 raw URL
  output_directory: lib/data/generated
  language: dart
  json_serializer: freezed
  use_freezed3: true                 # ← 필수 (D-1)
  client_postfix: Api
  put_clients_in_folder: true
  enums_to_json: true
  unknown_enum_value: true           # 서버가 enum 값을 추가해도 앱이 안 깨진다
```

`unknown_enum_value`는 켜두는 걸 권장한다. 서버가 enum에 새 값을 추가했을 때 구버전 앱이
파싱 실패로 죽는 대신 `$unknown`으로 떨어진다. 앱은 스토어 배포라 롤백이 느리므로 특히 중요하다.

```bash
dart run swagger_parser
dart run build_runner build --delete-conflicting-outputs
```

### D-3. 생성물이 기존 코드와 얼마나 같은가

거의 동일하다. 구조 변경이 필요 없다.

```dart
// 생성됨 — lib/data/generated/clients/posts_api.dart
@RestApi()
abstract class PostsApi {
  factory PostsApi(Dio dio, {String? baseUrl}) = _PostsApi;

  /// 게시글 조회
  @GET('/posts')
  Future<PostsResponse> postGetPosts({
    @Query('type') required Type type,
    @Query('page') num? page = 1,
    @Query('size') num? size = 10,
  });

  /// 공지사항 조회
  @GET('/posts/notices')
  Future<List<PostWithAuthorResponse>> postGetNotices();
}
```

현재 `post_api.dart`의 `getNotices(): Future<List<PostResponse>>`도 **버그가 아니다.**
앱의 `PostResponse`에는 `author` 필드가 있어서 서버의 `PostWithAuthorResponse`와 같은 모양이다.
다만 **타입 이름이 서버와 어긋나 있다** — 서버의 현재 `PostResponse`는 author가 없다.
생성물로 옮기면 이름이 서버와 1:1로 맞춰진다(`PostWithAuthorResponse`).

차이점은 두 가지뿐이다.

| 항목 | 기존 수기 | 생성물 |
|---|---|---|
| `@Freezed(copyWith: false)` | copyWith 비활성 | `@Freezed()` (copyWith 생성됨) |
| nullable 필드 | `String? thumbnail` | `required String? thumbnail` (명시적 전달 강제) |

### D-4. ⚠️ `toEntity()` 매핑 레이어는 옮겨야 한다

현재 수기 모델 68개 중 **52개가 `toEntity()` 확장**으로 도메인 엔티티(160개)에 매핑되어 있다.
생성 모델에는 이게 없다.

Dart 확장은 별도 파일에 둘 수 있으므로, 모델 파일에서 분리해 mapper 파일로 옮기면 된다.
Clean Architecture 구조는 그대로 유지된다.

```dart
// lib/data/mapper/post_mapper.dart (신규)
import 'package:grimity/data/generated/models/post_base_response.dart';
import 'package:grimity/domain/entity/post.dart';

extension PostBaseResponseX on PostBaseResponse {
  Post toEntity() => Post(
    id: id, title: title, content: content,
    thumbnail: thumbnail, createdAt: createdAt,
  );
}
```

**이 52개 이동이 Flutter 이관 작업량의 대부분이다.** 기계적이지만 건수가 있다.

### D-5. analysis_options.yaml에 생성 폴더 제외 추가

생성된 enum 파일에서 `unnecessary_cast` 경고 74건이 나온다(swagger_parser 코드 생성 특성,
동작에는 문제 없음). 현재 앱 설정은 `*.g.dart`와 `*.freezed.dart`만 제외하고 있으므로
생성 폴더를 추가한다.

```yaml
analyzer:
  exclude:
    - '**/*.g.dart'
    - '**/*.freezed.dart'
    - 'lib/data/generated/**'   # 추가
```

### D-6. ⚠️ enum 이름은 서버에서 먼저 고쳐야 한다

스펙의 enum이 대부분 **인라인**(이름 없는 스키마)이라, 생성기가 속성 이름으로 타입명을 만든다.
Dart에서 특히 문제가 되는 것들:

| 스펙 위치 | 생성되는 Dart 타입 | 문제 |
|---|---|---|
| `GET /posts ?type` | `Type` | **`dart:core.Type`과 이름 충돌** |
| `GET /feeds/search ?sort` | `Sort` | — |
| `GET /users/{id}/feeds ?sort` | `Sort2` | **번호가 붙음. 새 enum이 추가되면 번호가 밀려 기존 코드가 조용히 다른 타입을 가리킬 수 있다** |
| `GET /posts/search ?searchBy` | `SearchBy` | — |

쿼리 파라미터 인라인 enum이 9개, 컴포넌트 내 enum 속성이 30개 이상 있다.

서버에서 `@ApiProperty({ enum: postTypes, enumName: 'PostType' })`처럼 `enumName`을 지정하면
스펙에 명명된 스키마로 나오고, Dart·TS 양쪽 생성물 이름이 안정된다.
**Flutter 이관을 시작하기 전에 백엔드에 요청할 것.** 나중에 바꾸면 앱 코드가 전부 깨진다.

### D-7. 진행 순서

1. 백엔드에 enum 명명(D-6)과 `POST /albums` 메서드명(부록 A) 수정 요청
2. `swagger_parser.yaml` 작성 → 생성 → `build_runner`
3. `analysis_options.yaml` 제외 추가(D-5)
4. 도메인 하나(posts 권장)로 mapper 분리 패턴 확정(D-4)
5. 나머지 도메인 확장, 기존 `lib/data/model`·`lib/data/data_source/remote` 삭제

---

## 요약: 프론트가 실제로 해야 하는 일

1. `npm i -D orval` (1분)
2. `orval.config.ts` + `customAxios.ts` 작성 (30분) — 3절 그대로 복붙하면 된다
3. `npm run api:gen`, 결과물 커밋 (5분)
4. **도메인 하나씩** 훅 교체 + 쿼리키 교체 (도메인당 반나절)
5. 도메인별로 기존 `src/api/<도메인>/` 삭제
6. 전부 끝나면 `@grimity/dto`를 WebSocket 타입 전용으로 축소

1~3번은 하루 안에 끝나고 되돌리기도 쉽다. 4번이 실질적인 작업량이고,
**쿼리키(6절)만 조심하면** 나머지는 기계적인 치환이다.
