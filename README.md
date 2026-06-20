# 인택톡 프론트엔드

인택톡은 카카오 로그인 기반의 소규모 메신저 웹 앱이다. 이 저장소는 그 프론트엔드(React SPA/PWA)로, 채널코퍼레이션의 오픈소스 디자인 시스템 [Bezier](https://github.com/channel-io/bezier-react)(`@channel.io/bezier-react`)의 시각 언어 위에서 1:1·그룹 채팅, 실시간 메시지, 미디어(움짤) 전송, 웹 푸시 알림을 제공한다. 라이트/다크 테마를 모두 지원하며, 모바일은 별도 앱 없이 반응형 웹과 PWA(홈 화면 추가)로 대응한다.

## 요구 사항

- Node.js 20 이상 권장
- npm
- 백엔드 서버 (인택톡 백엔드 지시서 v2.0 구현체, 로컬 기본 `http://localhost:3000`)

## 실행

```bash
npm install

# 환경 변수 준비
cp .env.example .env
```

`.env` 항목:

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | REST API 베이스 URL (기본 `http://localhost:3000`) |
| `VITE_WS_URL` | Socket.IO 서버 origin. Engine.IO path `/ws`는 코드에서 설정한다 |
| `VITE_KAKAO_JS_KEY` | Kakao Developers 앱의 JavaScript 키 |
| `VITE_VAPID_PUBLIC_KEY` | 웹 푸시 VAPID 공개키(base64url). 비워두면 푸시 구독을 시도하지 않는다 |

```bash
npm run dev        # 개발 서버
npm run build      # 타입 체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # tsc -b
```

서비스 워커(`public/sw.js`)는 프로덕션 빌드에서만 등록된다. 개발 모드에서는 푸시 구독이 동작하지 않을 수 있으며, 이 경우 설정 화면의 푸시 상태는 "지원 안 함"으로 표시된다.

## 기술 스택

| 레이어 | 선택 |
|---|---|
| 언어/프레임워크 | React 18 + TypeScript (strict) |
| 빌드 | Vite |
| UI | Bezier (`@channel.io/bezier-react`, `@channel.io/bezier-tokens`, `@channel.io/bezier-icons`) |
| 라우팅 | React Router 6 |
| 서버 상태 | TanStack Query 5 (REST 캐싱, 메시지 무한스크롤) |
| 클라이언트 상태 | Zustand (세션, 테마, 활성 룸, 소켓 연결 상태) |
| 실시간 | socket.io-client 4 (백엔드 Socket.IO Gateway, Engine.IO path `/ws`) |
| 폼 | react-hook-form |
| 로그인 | Kakao JavaScript SDK → 백엔드 `/auth/kakao` 토큰 교환 |
| 미디어 재생 | 네이티브 `<img>`/`<video>` + IntersectionObserver |

## 정책 기본값

명세에서 열어둔 정책은 아래 기본값으로 동작한다.

- **움짤 자동 재생**: 기본 "Wi-Fi에서만". 설정 화면에서 항상/Wi-Fi에서만/안 함으로 변경할 수 있다. `navigator.connection`을 지원하지 않는 브라우저(Safari, Firefox 등)에서는 연결 종류를 알 수 없으므로 Wi-Fi로 간주하고 재생을 허용한다. 자동 재생 대상은 뷰포트에 들어온 미디어이며, 벗어나면 정지한다.
- **메시지 입력**: Enter 전송, Shift+Enter 줄바꿈. 한글 IME 조합 중에는 Enter 를 전송으로 처리하지 않는다.
- **메시지 무한스크롤**: 페이지 크기 50 (`GET /rooms/:id/messages?limit=50&cursor=`).
- **토스트**: Bezier Toast 기본 자동 닫힘(3초)을 그대로 사용한다. 재시도 같은 액션이 있는 토스트도 동일하다.

## 디자인 토큰 규칙

모든 색·반경·그림자·모션은 Bezier 디자인 토큰(시맨틱 토큰 CSS 변수 또는 컴포넌트 prop의 시맨틱 색 이름)으로만 지정한다. hex/rgba, 임의 px 반경, 임의 ms 하드코딩을 하지 않는다. 간격(padding/margin/gap)만 4px 그리드 숫자를 직접 쓴다.

예외는 두 곳이고, 둘 다 토큰 시스템 밖의 브랜드 자산이다.

1. **카카오 브랜드 버튼**: 카카오 로그인 버튼은 카카오 브랜드 가이드 색을 새 role(CSS 변수)로 정의해 쓴다. Bezier 팔레트에 해당 색이 없기 때문이다.
2. **PWA 매니페스트/아이콘**: `public/manifest.webmanifest`의 `background_color`/`theme_color`는 매니페스트 포맷 제약상 단일 hex(`#FFFFFF`, 라이트 기준)만 넣을 수 있어 토큰을 참조하지 못한다. `public/icons/`의 브랜드 아이콘도 Bezier `blue-400` 근사값(`#5E56F0`) hex를 직접 사용한 정적 자산이다.

## 백엔드 연동

REST/WebSocket 계약은 **인택톡 백엔드 지시서 v2.0** 명세를 단일 출처로 따른다.

- 카카오 로그인: Kakao JS SDK **v2**는 v1의 토큰 팝업 로그인(`Auth.login`)을 제공하지 않으므로 **인가 코드 방식**을 쓴다 — `Auth.authorize({ redirectUri: <origin>/login })`로 카카오 인증 페이지를 다녀온 뒤 `/login?code=`의 인가 코드를 `POST /auth/kakao { code, redirectUri }`로 보내고, 카카오 토큰 교환은 백엔드가 수행한다.
- REST: `VITE_API_BASE_URL` 기준. 401 응답 시 `/auth/refresh`로 단일 비행(single-flight) 토큰 갱신 후 1회 재시도한다. 에러 바디는 `{ statusCode, code, message }`.
- WebSocket: `VITE_WS_URL` origin 에 **Engine.IO path `/ws`**(기본 네임스페이스)로 Socket.IO 연결 — `io(VITE_WS_URL, { path: '/ws', auth: { token: accessToken } })`. URL 에 `/ws`를 붙이면 네임스페이스로 오인되어 핸드셰이크가 어긋난다. 수신 이벤트(`message:new`, `message:read`, `message:deleted`, `typing`, `presence`, `room:created`, `room:updated`)는 TanStack Query 캐시에 머지하고, 발행(`message:send`)은 ack의 `seq`로 낙관적 업데이트를 확정한다(`clientMessageId` 멱등 키).
- 웹 푸시: 구독 객체를 `POST /push/tokens`로 등록하고 `DELETE /push/tokens`로 해제한다. 서비스 워커가 `{ title, body, roomId? }` 페이로드를 알림으로 표시하고, 클릭 시 해당 방으로 이동한다.
- 로컬 개발 기본 포트: 백엔드 `3000`, 프론트엔드 Vite 개발 서버 `5173`.

## 배포 (Cloudflare Pages)

정적 SPA이므로 빌드 산출물(`dist/`)을 Cloudflare Pages에 올리면 된다. 저장소에 배포용 구성이 포함돼 있다.

- SPA 라우팅 폴백: 산출물에 `404.html`이 없으면 Pages가 매칭되지 않는 경로에 `index.html`을 200으로 서빙한다(자동 SPA 모드). 별도 `_redirects`가 필요 없다.
- `public/_headers`: 서비스 워커/매니페스트 no-cache, `/assets/*` 영구 캐시.
- `.node-version`: 빌드 Node 22 (Vite 8 요구사항).

### 방법 1 — Git 연동 (권장)

1. 저장소를 GitHub/GitLab에 push 한다.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → 저장소 연결.
3. 빌드 설정: Framework preset **Vite**, Build command `npm run build`, Build output directory `dist`.
4. Settings → Environment variables에 **Production / Preview 각각** `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_KAKAO_JS_KEY`, `VITE_VAPID_PUBLIC_KEY`를 등록한다. `VITE_*`는 빌드 시점에 번들로 인라인되므로 값을 바꾸면 재배포해야 한다.
5. 기본 브랜치 push → Production, 그 외 브랜치 push → Preview(랜덤 서브도메인) 배포.

### 방법 2 — wrangler 직접 업로드 (git 없이)

로컬 빌드를 그대로 올린다. 환경 변수는 로컬 `.env.production`에서 빌드 시점에 주입된다.

```bash
# .env.production 에 운영값 작성 (VITE_API_BASE_URL=https://api.example.com 등)
npm run build
npx wrangler pages deploy dist --project-name intaektalk
```

### 배포 전 체크리스트

- **백엔드 CORS/WS**: 백엔드가 Pages 도메인(`https://<프로젝트>.pages.dev`와 커스텀 도메인)을 REST CORS와 Socket.IO `cors` 양쪽에서 허용해야 한다. 허용 헤더는 `Authorization`, `Content-Type`. 쿠키를 쓰지 않으므로 credentials 설정은 불필요하다.
- **HTTPS/WSS**: Pages는 HTTPS로 서빙되므로 `VITE_API_BASE_URL`/`VITE_WS_URL`도 https여야 한다(mixed content 차단). socket.io-client는 https origin에 자동으로 wss를 쓴다.
- **카카오 개발자 콘솔**: 내 애플리케이션 → 플랫폼 Web에 배포 도메인 등록, 카카오 로그인 활성화, **Redirect URI에 `https://<도메인>/login` 등록**(인가 코드 방식 필수). Preview 배포의 랜덤 서브도메인은 등록할 수 없으므로 로그인 테스트는 등록된 도메인에서만 가능하다.
- **미디어 스토리지 CORS**: presigned 업로드 대상(S3/R2 등)이 배포 도메인의 `PUT`을 허용해야 한다.
- **웹 푸시**: `VITE_VAPID_PUBLIC_KEY`를 운영 키로 설정한다. 서비스 워커는 프로덕션 빌드에서만 등록된다.

## 폴더 구조

```
public/
  manifest.webmanifest   # PWA 매니페스트
  sw.js                  # 서비스 워커 (캐시 + 웹 푸시)
  icons/                 # 브랜드 아이콘 (svg/png)
src/
  components/            # 공용 컴포넌트 (AvatarUploader 등)
  features/rooms/        # 그룹 생성/관리 모달
  hooks/                 # queries, useBreakpoint, useResolvedTheme
  layouts/               # AppLayout (데스크톱 분할 / 모바일 스택)
  lib/
    api/                 # client(fetch + 토큰 갱신), endpoints, types(DTO/WS 계약)
    query/               # TanStack Query 키
    socket/              # SocketProvider, 캐시 머지 헬퍼
    format.ts            # 시간/미리보기 포맷
    kakao.ts             # Kakao SDK 로더
    push.ts              # 웹 푸시 구독/해제
    roomDisplay.ts       # 방 이름/아바타 표시 규칙
  pages/                 # Login, Onboarding, Room, Search, Settings 등
  routes/                # router, 가드 (로그인/온보딩 분기)
  stores/                # authStore, uiStore, presenceStore (Zustand)
  styles/                # 전역 CSS (토큰 로드)
```
