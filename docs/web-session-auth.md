# 기존 API의 헤더 우선 인증 + 웹 쿠키 인증

웹·Flutter·데스크톱은 기존 API 경로와 JSON 응답을 그대로 사용한다.
Authorization 헤더가 **있으면 헤더만 검증**하고, **없을 때만 쿠키**를 사용한다.
별도의 `/auth/session` API는 없다. Prisma 스키마 변경이나 마이그레이션도 없다.

## 인증 우선순위와 401

| 요청 상태 | 인증 필수 API의 처리 |
| --- | --- |
| 유효한 Authorization 헤더 | 헤더의 계정으로 처리. 쿠키가 없거나 잘못됐거나 다른 계정이어도 인증을 방해하지 않음 |
| 만료·위조·형식 오류·빈 Authorization 헤더 | 기존처럼 401. 정상 쿠키가 있어도 재시도하지 않음 |
| 헤더 없음 + 유효한 공유 쿠키 + 허용된 웹 Origin | 쿠키의 계정으로 처리 |
| 헤더 없음 + 쿠키 없음·만료·위조·폐기 | 401 |
| 헤더 없음 + 쿠키 있음 + 허용되지 않은/없는 Origin | 403. 쿠키 인증은 명시적인 Origin 검사를 통과해야 함 |

공개 조회 API의 `OptionalJwtGuard`는 기존처럼 잘못된 헤더를 비로그인으로 처리한다.
이때도 쿠키로 전환하지 않는다. 헤더 없이 유효한 쿠키만 있으면 로그인 사용자로 조회하며,
만료·위조 쿠키는 비로그인으로 처리한다. 쿠키 인증의 Origin 실패는 403이다.

일반 API의 `JwtGuard`와 `OptionalJwtGuard`, 인증 API의 `JwtRefreshGuard`에 같은 우선순위를 적용한다.
별도 관리자 토큰을 사용하는 AdminGuard와 WebSocket 연결 인증은 기존 방식을 유지한다.

## 기존 API 계약

| 요청 | 처리 | 응답 |
| --- | --- | --- |
| `POST /auth/login` | 기존 소셜 로그인. 허용된 웹 Origin이면 쿠키도 발급 | 기존 `{ id, accessToken, refreshToken }` |
| `POST /auth/register` | 기존 회원가입. 허용된 웹 Origin이면 쿠키도 발급 | 기존 `{ id, accessToken, refreshToken }` |
| `GET /auth/refresh` | 헤더 refreshToken 우선. 헤더가 없으면 공유 쿠키로 토큰 발급 | 양쪽 모두 기존 `{ accessToken, refreshToken }` |
| `POST /auth/logout` | 헤더 refreshToken 우선. 헤더가 없으면 공유 쿠키 세션 폐기 | 기존 204 |
| 일반 API (`GET /me`, `PUT /me` 등) | 헤더 accessToken 우선. 헤더가 없으면 공유 쿠키 인증 | 기존 응답 |

로그인·회원가입 요청의 계정은 기존 소셜 로그인 입력으로 결정한다.
헤더 refresh가 성공하면 해당 헤더 계정의 쿠키를 발급/갱신한다. 다른 계정의 쿠키 때문에 401을 반환하지 않는다.
헤더 logout은 해당 헤더의 토큰과 연결된 공유 세션을 폐기한다.
같은 계정의 쿠키가 있으면 함께 폐기·삭제하지만, 다른 계정의 쿠키는 건드리지 않는다.
헤더가 없을 때의 logout은 유효한 쿠키가 필요하다. 인증정보가 없거나 만료된 경우 401이다.

## 공유 쿠키

- 이름: `grimity_session`
- 속성: `HttpOnly; Secure; SameSite=Lax; Path=/`
- Domain은 생략한다. 두 웹사이트는 같은 API 호스트를 호출한다.
- 만료 기간: 기존 `JWT_REFRESH_EXPIRES_IN`. 로그인과 성공한 refresh에서 쿠키를 발급/갱신한다.
- 일반 API의 쿠키 인증은 서명·만료·서버 세션·클라이언트 정보를 검사한다. 매 응답에서 쿠키를 재발급하지는 않는다.
- 쿠키 JWT는 refresh secret에서 별도로 파생한 키로 서명한다. 헤더 accessToken/refreshToken으로 사용할 수 없다.
- 일반 API에서도 사용하므로 이전 초안의 `Path=/auth`에서 `Path=/`로 변경했다.

기존 `RefreshToken` 테이블에 `token = web-session:<UUID>`인 세션 레코드를 저장한다.
쿠키의 sessionId로 레코드의 존재, 브라우저 정보, 마지막 사용 시각을 확인한다.
쿠키 JWT 자체는 DB에 저장하지 않는다. 쿠키 요청에는 세션 DB 확인이 추가된다.

각 웹이 refresh에서 받는 refreshToken은 별도로 회전하고 같은 sessionId에 연결된다.
두 웹이 동시에 쿠키로 refresh하거나 각자의 헤더 토큰을 갱신해도 서로의 토큰을 직접 무효화하지 않는다.
이 쿠키는 일회용 refreshToken이 아니라 서버에서 폐기 가능한 웹 세션이다.

로그아웃하거나 같은 브라우저에서 다시 로그인하면 기존 공유 세션을 폐기한다.
폐기된 세션의 쿠키 인증과 연결된 refreshToken의 갱신은 거절된다. 다른 브라우저·앱 세션은 유지한다.
이미 발급된 accessToken은 기존대로 만료까지 유효하다. 사이트 화면의 즉시 로그아웃 동기화는 별도 프론트 작업이다.

## 기존 클라이언트와 단계적 배포

배포 전에 발급된 sessionId 없는 refreshToken도 계속 허용한다.
허용된 웹 Origin의 로그인·refresh에는 쿠키를 추가로 발급하고 새 refreshToken에 세션을 연결한다.
브라우저가 쿠키를 저장하거나 전송하지 않아도 기존 헤더 인증과 반복적인 토큰 갱신은 동작한다.
기존 Flutter 요청도 쿠키 없이 같은 경로를 사용한다.

기존의 모든 Origin 대상 비쿠키 CORS 접근을 유지한다.
`AUTH_ALLOWED_ORIGINS`는 **쿠키 사용을 허용할 Origin 목록**이다. 목록 밖이라고 기존 헤더 요청을 403으로 막지 않는다.

- 허용 Origin: 해당 Origin을 `Access-Control-Allow-Origin`으로 반환하고 credentials 허용.
- 그 외 Origin/Origin 없음: 기존처럼 `Access-Control-Allow-Origin: *`, credentials 미허용.
- 로그인·회원가입도 목록 밖에서는 기존 JSON 응답만 반환하고 쿠키를 발급·삭제하지 않는다.
- 쿠키에 의존하는 인증은 CORS와 별개로 허용 Origin을 검사해 CSRF를 방어한다.
- `Vary: Origin`으로 CORS 응답을 구분한다.

백엔드를 먼저 배포하고 프론트는 나중에 연동할 수 있다. 실제 배포 환경의 프록시/CDN 검증까지 완료한 것은 아니다.
기존 JWT secret/만료 설정을 유지하고, 배포 후 기존 웹·앱의 로그인·갱신·로그아웃을 확인한다.

## 프론트 연동

기존 localStorage 저장, 토큰 응답 처리, Authorization 헤더 전송, 401 재발급 흐름을 유지한다.
cross-origin 쿠키를 사용하려는 요청에는 `withCredentials: true`가 필요하다.
일반 API도 쿠키만으로 호출하려면 해당 API 요청에도 적용한다.

다른 사이트에서 로컬 토큰이 없을 때 선택할 수 있는 흐름:

1. 헤더 없이 기존 `GET /auth/refresh`를 credentials와 함께 호출한다.
2. 응답의 accessToken·refreshToken을 기존 저장소에 넣는다.
3. 기존 `GET /me`로 사용자 정보와 로그인 UI 상태를 복원한다.

쿠키만 사용하는 클라이언트라면 헤더 없이 기존 일반 API를 직접 호출할 수도 있다.
서버는 프론트의 localStorage나 로그인 UI를 자동으로 채우지 않는다.
만료된 헤더를 보내면 쿠키가 있어도 401이므로, 쿠키 복원을 의도한 요청에는 Authorization을 붙이지 않는다.
네트워크/CORS 오류와 인증 만료를 구분한다.

## 환경변수와 인프라

```dotenv
AUTH_ALLOWED_ORIGINS=https://www.grimity.com,https://board.grimity.com,https://grimity.com
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
```

기본값이 위와 같아 운영용 새 환경변수는 필수가 아니다. 명시적으로 설정하면 기본 목록을 대체한다.
쿠키를 사용할 localhost·개발·미리보기 주소가 있으면 정확한 Origin을 추가한다.
와일드카드, null, 경로가 붙은 URL은 허용하지 않는다.
로컬 HTTP 개발에서만 `AUTH_COOKIE_SECURE=false`를 사용할 수 있다.
production 또는 SameSite=None에서는 Secure가 필요하다.

공유 로그인에는 두 사이트가 같은 `https://api.grimity.com` 같은 API 주소를 사용해야 한다.
`*.cloudfront.net` 직접 호출은 cross-site 쿠키 제한을 받으므로 공유 로그인용 주소로 사용하지 않는다.

CloudFront/리버스 프록시에서:

- Origin과 Authorization을 원본으로 전달하고 CORS 응답을 Origin별로 구분한다.
- 쿠키 인증을 사용하는 **일반 API를 포함한 경로**에 Cookie를 전달한다. /auth만 설정하면 충분하지 않다.
- /auth 응답의 Set-Cookie를 전달하고 인증 경로 캐시를 비활성화한다(Minimum TTL 포함 0).
- 사용자별 응답을 캐시하지 않는다. 서버는 인증 API와 인증 필수 API, 인증정보가 있는 공개 조회 응답에
  `Cache-Control: private, no-store, max-age=0`를 설정한다. CDN이 이를 무시하거나 인증 요청에 익명 캐시를 반환하지 않게 한다.
- 공개 조회 응답은 Cookie·Authorization·Origin에 따라 구분한다. CDN이 Vary를 자동 반영한다고 가정하지 않는다.

## 검증

- 기존 로그인·회원가입·refresh·로그아웃의 응답 및 Flutter 헤더 인증.
- 쿠키를 보내지 않는 기존 웹의 반복 갱신.
- 일반 API의 쿠키 조회·수정, 공개 조회의 로그인/비로그인 동작.
- 헤더 계정 A와 쿠키 계정 B의 충돌, 만료·위조·빈 헤더의 401 및 쿠키 우회 금지.
- 기존 경로의 쿠키 refresh·logout, 동시 갱신, 세션 폐기, 계정 변경.
- Origin 검증, 쿠키 위조·만료, 기존 CORS 접근 유지 및 캐시 방지.
- 별도 /auth/session 경로 제거.

E2E는 데이터를 삭제하므로 반드시 별도 테스트 DB에서 실행한다.
실제 브라우저와 운영 CDN을 통한 연동은 배포 전후 별도로 확인한다.

참고: [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie),
[OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
