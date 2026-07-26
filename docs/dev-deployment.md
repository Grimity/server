# 개발 서버 배포 가이드

dev API(`api-dev.grimity.com`) 배포 절차와 주의점.

- 호스트: Oracle Cloud 인스턴스
- 접속: `ssh grimity-oracle`
- 배포 경로: `~/server`
- 프로세스 관리: pm2 (`grimity-server`)
- 리버스 프록시: Caddy
- 브랜치: `dev`

---

## 1. 재배포

```bash
ssh grimity-oracle
cd ~/server && \
  git pull && \
  npm ci && \
  npx prisma generate && \
  npm run build && \
  pm2 restart grimity-server
```

각 단계가 왜 필요한지:

| 단계 | 이유 |
|---|---|
| `npm ci` | `package-lock.json` 그대로 설치. `npm install`은 lock을 바꿀 수 있어 쓰지 않는다 |
| `npx prisma generate` | **생략하면 빌드가 깨진다.** `prisma/schema.prisma`가 바뀌었는데 클라이언트를 재생성하지 않으면 `Property 'xxx' does not exist on type 'PrismaClient'` 류의 TS 에러가 난다 |
| `npm run build` | `nest build` → `dist/main.js` 생성 |
| `pm2 restart` | pm2가 `dist/main.js`를 실행 중이므로 빌드 후 재시작 필요 |

### DB 마이그레이션은 이 절차에 없다

위 명령에는 `prisma migrate deploy`가 **포함돼 있지 않다.** `generate`는 타입/클라이언트만
다시 만들 뿐 DB 스키마를 건드리지 않는다. `prisma/migrations`에 새 마이그레이션이 있으면
배포와 별개로 직접 적용해야 한다.

---

## 2. 로그 확인

```bash
pm2 logs grimity-server          # 실시간
pm2 logs grimity-server --lines 200
pm2 status                       # 프로세스 상태·재시작 횟수·메모리
```

앱은 `process.on('uncaughtException')` / `unhandledRejection` 핸들러로 예외를 삼키고
`console.error`만 찍은 뒤 계속 살아 있으므로([src/main.ts](../src/main.ts)),
"죽지는 않았는데 이상하다" 싶으면 pm2 status가 아니라 **로그를 봐야 한다.**

---

## 3. 환경변수 — 주의해서 볼 것

### 앱은 `.env` 하나만 읽는다

[src/app.module.ts](../src/app.module.ts)의 `ConfigModule.forRoot()`에 `envFilePath`가
지정돼 있지 않다. 즉 **실행 디렉터리(`~/server`)의 `.env` 파일만** 로드된다.

레포에 있는 `env/.env.dev`, `env/.env.prod`, `env/.env.local`은 **자동으로 읽히지 않는
수동 템플릿**이다. 어떤 코드·스크립트도 이 경로를 참조하지 않는다.

### `env/`는 gitignore 대상이다

```
.gitignore:44   env/
```

git이 추적하는 파일이 0개다. 따라서 **로컬에서 `env/.env.dev`를 고쳐도 서버에는 아무 영향이
없다.** 서버의 `~/server/.env`는 별개 사본이므로 값을 바꾸려면 서버에서 직접 고쳐야 한다.

### ⚠️ `env/.env.dev`의 REDIS_HOST가 낡았다

현재 `env/.env.dev`는 삭제된 Redis Cloud 주소(`redis-....redislabs.com`)를 그대로 갖고 있다.
템플릿으로 쓰다가 그대로 복사하면 서버가 붙지 못한다. `REDIS_HOST="localhost"`로 갱신해 둘 것.

| 파일 | REDIS_HOST |
|---|---|
| `env/.env.dev` | ❌ 삭제된 Redis Cloud 주소 |
| `env/.env.local` | `localhost` |
| 루트 `.env`(로컬 작업용) | `localhost` |

---

## 4. Redis

dev용 Redis Cloud DB가 삭제됐다(무료 티어 장기 미사용으로 추정). 지금은 **인스턴스에 설치한
로컬 Redis**로 대체해 운영 중이다.

- 접속 정보: `REDIS_HOST=localhost`
- **캐시·pub/sub 데이터가 인스턴스 안에만 존재한다.** 외부 백업이 없으므로 인스턴스를
  재생성하면 전부 사라진다. 캐시라 재구성되지만, 채팅·알림 pub/sub이 Redis를 타므로
  Redis가 죽으면 실시간 기능이 멈춘다
- Redis가 떠 있는지: `redis-cli ping` → `PONG`

---

## 5. 재부팅 시

Redis, 앱(pm2), Caddy **모두 자동으로 올라온다.** 재부팅 후 수동 조치는 필요 없다.

정상 확인:

```bash
curl -s https://api-dev.grimity.com/health-check     # OK
curl -s -o /dev/null -w "%{http_code}\n" https://api-dev.grimity.com/api   # 200 (Swagger UI)
```

---

## 6. 자주 막히는 것

| 증상 | 원인 | 조치 |
|---|---|---|
| 빌드 시 `Property 'xxx' does not exist on type 'PrismaClient'` | `prisma generate` 누락 | `npx prisma generate` 후 재빌드 |
| `Cannot find module '.../dist/main'` | 빌드 산출물 경로가 밀림. 루트에 새 디렉터리가 생기면 tsc의 rootDir 추론이 바뀌어 `dist/main.js` → `dist/src/main.js`로 이동한다 | `tsconfig.build.json`의 `exclude`에 해당 디렉터리 추가 (현재 `scripts`가 그래서 제외돼 있다) |
| 실시간(채팅·알림)만 동작 안 함 | Redis 다운 | `redis-cli ping` 확인 |
| 포트 충돌 | 앱 기본 포트 3000 (`PORT` 환경변수로 변경 가능) | `lsof -nP -iTCP:3000 -sTCP:LISTEN` |

---

## 7. GitHub Actions는 dev 배포에 쓰지 않는다

[.github/workflows/deploy.yaml](../.github/workflows/deploy.yaml)은 `workflow_dispatch`
(수동 실행) 전용이고, AWS Auto Scaling Group을 refresh하는 내용이다.
파일 안에 `# 이제 ASG 안씀` 주석이 있고 커밋 이력도 `cd 비활성화` → `github action deploy
주석처리` 순으로 남아 있다. **dev 배포는 위 1번의 수동 절차로 한다.**

PR에서 도는 워크플로는 [test.yaml](../.github/workflows/test.yaml)이며 다음을 검사한다.

- `openapi:check` — 커밋된 `openapi/openapi.json`이 소스와 일치하는지 (DB·시크릿 불필요)
- E2E / 단위 테스트 — Postgres·Redis 컨테이너를 띄워서 실행

---

## 8. 로컬에서 서버를 띄울 때

참고로 로컬 실행에는 Postgres와 Redis가 모두 필요하다.

```bash
docker run --name postgres -e POSTGRES_PASSWORD=postgres -d -p 5432:5432 postgres:16
docker run --name redis -d -p 6379:6379 redis
npm run start:dev
```

단위 테스트([test/unit](../test/unit))는 내부에서 `app.listen(3000)`을 하드코딩하므로
**포트 3000이 비어 있어야** 통과한다. 개발 서버를 띄워둔 채 테스트를 돌리면 `EADDRINUSE`로
전부 실패한다.
