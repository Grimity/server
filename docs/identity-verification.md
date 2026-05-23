# 본인인증 API 문서

포트원(PortOne) V2 SDK + KG이니시스 통합인증으로 본인인증을 처리한다. 프론트에서 PortOne JS SDK 로 인증 창을 띄워 `identityVerificationId` 를 받은 뒤, 그 값을 서버에 전달하면 서버가 PortOne REST API 로 검증·저장한다.

- Base URL: 환경별 서버 주소 (예: `https://api.grimity.com`)
- 인증: 일반 사용자 JWT (`Authorization: Bearer <accessToken>`) 필요. 401 응답은 모든 엔드포인트에서 공통.
- 모든 요청/응답은 JSON

---

## 1. 전체 흐름

```
[프론트]                                    [서버]                   [PortOne]
  |                                           |                        |
  | (1) PortOne.requestIdentityVerification() |                        |
  |------------------------------------------>|                        |
  |                                           |                        |
  | (응답) identityVerificationId             |                        |
  |<----------------------------------------- |                        |
  |                                           |                        |
  | (2) POST /me/identity-verification        |                        |
  |     body: { identityVerificationId }      |                        |
  |------------------------------------------>|                        |
  |                                           | (3) getIdentityVerification
  |                                           |----------------------->|
  |                                           |<-----------------------|
  |                                           | (4) DB upsert          |
  |                                           |                        |
  | 204 No Content                            |                        |
  |<------------------------------------------|                        |
```

1. 프론트가 PortOne SDK 로 본인인증 창을 띄워 사용자 인증을 완료한다.
2. SDK 가 반환한 `identityVerificationId` 를 서버의 `POST /me/identity-verification` 으로 전달한다.
3. 서버는 PortOne REST API (`getIdentityVerification`) 로 인증 결과를 조회·검증한다.
4. 검증 통과 시 `IdentityVerification` 테이블에 upsert.

서버 측 검증 항목:

- 상태가 `VERIFIED` 인지
- `ci` 가 응답에 포함되는지 (KG이니시스 카카오 인증의 경우 ci 미제공)
- `name`, `phoneNumber`, `birthDate` 모두 존재하는지
- 기존 본인 인증 레코드가 있으면 동일 ci 인지 (다른 ci 로 갱신 불가)
- 다른 유저가 같은 ci / 같은 `identityVerificationId` 를 사용 중이 아닌지

---

## 2. 엔드포인트

### `POST /me/identity-verification` — 본인인증 완료 처리

프론트가 PortOne SDK 로 본인인증을 마치고 받은 `identityVerificationId` 를 서버에 등록한다.

**Request Body**

| 필드                     | 타입   | 필수 | 설명                                            |
| ------------------------ | ------ | ---- | ----------------------------------------------- |
| `identityVerificationId` | string | ✅   | PortOne SDK 가 발급한 본인인증 ID (1–200자)     |

**Response 204**

본문 없음.

**에러**

응답 본문은 `{ status, errorCode }` 형식. 프론트는 `errorCode` 로 분기한다.

| 상태 | errorCode                      | 의미                                                                       |
| ---- | ------------------------------ | -------------------------------------------------------------------------- |
| 400  | -                              | 유효성 검사 실패 (`identityVerificationId` 누락 / 길이 초과)               |
| 401  | -                              | JWT 인증 실패                                                              |
| 409  | `CI_MISMATCH`                  | 본인이 이미 다른 ci 로 인증되어 있어 갱신 불가 (같은 ci 로만 재인증 가능)  |
| 409  | `CI_TAKEN`                     | 다른 유저가 이미 같은 ci 로 인증되어 있음 (1인 1계정)                       |
| 409  | `ID_REUSED`                    | 다른 유저가 같은 `identityVerificationId` 로 이미 인증을 완료함            |
| 422  | `NOT_VERIFIED`                 | PortOne 인증 상태가 `VERIFIED` 가 아님 (`READY` / `FAILED` 등)             |
| 422  | `CI_NOT_PROVIDED`              | PortOne 응답에 `ci` 가 없음 (예: KG이니시스 카카오톡 인증)                 |
| 422  | `INCOMPLETE_VERIFIED_CUSTOMER` | `name` / `phoneNumber` / `birthDate` 중 하나 이상 누락                     |
| 500  | -                              | PortOne API 호출 자체가 실패 (인증ID 미존재 · 키 만료 · 네트워크 등). 서버 로그로 디버깅 |

> **참고**: PortOne SDK 호출 단계에서 발생하는 에러(존재하지 않는 ID, 인증 키 오류, 업스트림 장애 등)는 별도 errorCode 로 분기하지 않고 그대로 unhandled error 로 전파하여 서버 로그에 스택트레이스를 남긴다.

---

### `GET /me/identity-verification` — 내 본인인증 상태 조회

**Response 200**

```ts
{
  isVerified: boolean;
  name: string | null;       // 인증된 실명, 미인증 시 null
  birthDate: string | null;  // "YYYY-MM-DD", 미인증 시 null
}
```

미인증 사용자는 `{ isVerified: false, name: null, birthDate: null }`.

전화번호 / 성별 / ci 등은 응답에 포함하지 않는다. PII 노출 최소화.

---

### `GET /me` — 내 정보 조회 (관련 필드만 발췌)

기존 응답에 `isVerified` 필드가 추가된다.

```ts
{
  // ... 기존 필드 ...
  isVerified: boolean;  // 본인인증 완료 여부
}
```

`isVerified` 는 `IdentityVerification` 테이블의 레코드 존재 여부로 계산되며, 별도 컬럼이 아니다 (Kysely EXISTS 서브쿼리).

---

## 3. 데이터 모델

```prisma
model IdentityVerification {
  userId                 String   @id @db.Uuid           // User.id 와 1:1
  identityVerificationId String   @unique                // PortOne 응답 id (재사용 방지)
  ci                     String   @unique                // 1인 1계정 검증용
  name                   String                          // 실명
  phoneNumber            String                          // 숫자만 (e.g. "01012345678")
  birthDate              DateTime @db.Date               // YYYY-MM-DD
  gender                 String                          // "MALE" / "FEMALE" / ""
  isForeigner            Boolean
  pgProvider             String                          // e.g. "INICIS_UNIFIED"
  pgTxId                 String                          // PG사 거래 ID (감사용)
  updatedAt              DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**저장 방식**: 모든 PII 는 평문으로 저장한다. DB 접근 제어로 보호.

**유니크 제약**:

- `ci` — 1인 1계정 정책 강제
- `identityVerificationId` — 동일 인증 토큰을 다른 유저가 재사용하는 것을 방지

`User` 모델에는 `identityVerification IdentityVerification?` 관계가 추가된다.

---

## 4. 환경 변수

| 키                    | 필수 | 설명                                                            |
| --------------------- | ---- | --------------------------------------------------------------- |
| `PORTONE_API_SECRET`  | ✅   | PortOne 콘솔에서 발급받은 API Secret. 부팅 시 누락이면 서버 시작 실패 |

---

## 5. 코드 구성

### 신규 모듈 — `src/infrastructure/portone/`

PortOne SDK 래퍼.

- `portone.module.ts` — `PortOneService` 를 provider 로 등록 · export
- `portone.service.ts` — `@portone/server-sdk` 의 `IdentityVerificationClient` 를 생성자에서 한 번 만들어두고, `getIdentityVerification(id)` 한 메서드만 노출

`UserModule` 에서 `imports: [..., PortOneModule]` 로 등록되어 있어 `UserService` 가 주입받아 쓴다.

### 신규 예외 클래스 — `src/core/exception/`

- `custom.exception.ts` — `errorCode` 를 응답 본문에 실어 보내는 얇은 `HttpException` 래퍼

```ts
export class CustomException<T extends string = string> extends HttpException {
  constructor(status: number, body: { errorCode: T }) {
    super({ status, ...body }, status);
  }
}
```

### 사용자 모듈 변경 — `src/module/user/`

- `dto/identity-verification.error.ts` — `IdentityVerificationErrorCode` 상수, `VerifyIdentity409Response` / `VerifyIdentity422Response` Swagger DTO
- `dto/user.request.ts` — `VerifyIdentityRequest` 추가
- `dto/user.response.ts` — `MyIdentityVerificationResponse` 추가, `MyProfileResponse.isVerified` 필드 추가
- `repository/user.reader.ts` — `getMyProfile` Kysely 쿼리에 `EXISTS(IdentityVerification ...)` 서브쿼리, `findIdentityVerificationByUserId` 메서드
- `repository/user.writer.ts` — `upsertIdentityVerification` (unique 충돌을 `ID_REUSED` / `CI_TAKEN` 으로 분류)
- `user.service.ts` — `verifyIdentity` / `getMyIdentityVerification` 메서드, `PortOneService` 주입
- `me.controller.ts` — 두 엔드포인트 추가

---

## 6. 정책 메모

| 항목                    | 정책                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| PII 저장 방식           | 평문                                                                                              |
| 재인증 정책             | 같은 ci 로만 허용 (다른 사람 명의로 갱신 불가)                                                    |
| ci 중복 (다른 유저)     | 차단 (409 `CI_TAKEN`) — 1인 1계정                                                                 |
| identityVerificationId  | 다른 유저가 같은 id 사용 시 차단 (409 `ID_REUSED`)                                                |
| 인증 시각 freshness     | 체크하지 않음 (SDK / PortOne 측 신뢰)                                                             |
| PortOne API 에러        | unhandled 로 전파 → 500 + 서버 로그 스택트레이스                                                  |
| 카카오톡 인증 (ci 없음) | 422 `CI_NOT_PROVIDED` 로 거부 — ci 가 없으면 1인 1계정 검증 불가하므로 본 서비스에서는 허용 안 함 |

---

## 7. PortOne SDK 응답 참고

서버가 PortOne 에서 받는 `VerifiedIdentityVerification` 의 주요 필드:

```ts
{
  status: "VERIFIED",
  id: string,                       // identityVerificationId
  channel?: { pgProvider: string }, // e.g. "INICIS_UNIFIED"
  verifiedCustomer: {
    name: string,                   // KG이니시스: 항상 제공
    phoneNumber?: string,           // KG이니시스: 항상 제공
    birthDate?: string,             // "YYYY-MM-DD"
    gender?: "MALE" | "FEMALE",     // KG이니시스: 카카오 제외 항상 제공
    isForeigner?: boolean,
    ci?: string,                    // KG이니시스: 카카오 제외 항상 제공
    di?: string,                    // KG이니시스: 미제공
  },
  verifiedAt: string,               // RFC 3339
  pgTxId: string,
}
```

KG이니시스 통합인증 기준 가용 인증 수단: 네이버 / PASS / TOSS / 금융인증서 / 카카오 / 신한 / KB모바일 / 삼성패스. 이 중 **카카오만 ci 미제공**이므로 본 서비스에서 카카오 인증은 사실상 사용 불가.
