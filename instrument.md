# 인택톡(Intaktok) 프론트엔드 구축 지시서

> **목적**: Claude Code가 이 문서를 기반으로 인택톡 프론트엔드(웹)를 단계별로 구현한다.
> **디자인 기반**: 채널코퍼레이션의 오픈소스 React 디자인 시스템 **Bezier**(Apache-2.0). 시각 언어만 차용하고, 채널톡의 B2B 메시징 도메인 개념은 가져오지 않는다.
> **짝 문서**: `인택톡 백엔드 구축 지시서 v2.0`(REST/WebSocket API, 인증, 모델). 본 문서의 데이터·이벤트는 그 명세를 따른다.
> **플랫폼(확정)**: **React 웹 전용**. 반응형 웹(SPA/PWA)으로 구현하며 별도 네이티브 앱 출시 계획은 없다. 모바일은 반응형 웹/PWA로 커버한다.

---

## 0. 한눈에 보는 요약

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 18 + TypeScript + Vite |
| 디자인 시스템 | Bezier (`@channel.io/bezier-react`, `@channel.io/bezier-tokens`, `@channel.io/bezier-icons`) |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query (REST 캐싱/동기화) |
| 클라이언트 상태 | Zustand (경량 전역 상태: 세션, 활성 룸 등) |
| 실시간 | socket.io-client (백엔드 Socket.IO Gateway 연동) |
| 로그인 | Kakao JavaScript SDK → 백엔드 `/auth/kakao` |
| 테마 | 라이트/다크 1급 지원(Bezier 시맨틱 토큰 기반) |
| 핵심 화면 | 로그인 → 온보딩 → 채팅 목록 → 대화방 → 그룹 생성/관리 → 검색 → 설정 |

> **디자인 원칙 한 줄 요약**: Bezier에서 차용할 것은 **시각 언어**(squircle 라운딩, 8~12px 반경, Inter/Noto Sans KR 2-weight 타입, 11-hue 액센트, 라이트+다크 시맨틱 토큰, 150ms 마이크로 모션)이지 채널톡의 서비스 도메인이 아니다.

---

## 1. 디자인 시스템 기반 (Bezier)

### 1.1 개요 & 플랫폼

- Bezier는 채널톡 제품 UI를 외부 공개한 한국발 풀 디자인 시스템이다. **컴포넌트 59개 + 아이콘 598개 + 디자인 토큰** 구성, 라이선스는 Apache-2.0.
- 토큰을 별도 패키지로 분리해 **라이트·다크 멀티 테마를 1급으로 지원**한다.
- **플랫폼(확정)**: React **웹**으로만 개발한다(네이티브 앱 계획 없음). `@channel.io/bezier-react`가 React 웹 컴포넌트이므로 그대로 사용한다. 모바일 대응은 반응형 레이아웃 + PWA(홈화면 추가)로 처리한다(아래 §10).

### 1.2 패키지

```
@channel.io/bezier-react    # 컴포넌트 라이브러리 (React 웹)
@channel.io/bezier-tokens   # 디자인 토큰 (CSS 변수 / JSON)
@channel.io/bezier-icons    # 아이콘 세트 (598 SVG, 24×24, currentColor, outline/-filled 쌍)
```

> 설치 시 최신 stable 버전을 사용하고, 정확한 토큰값이 필요하면 코드에 하드코딩하지 말고 항상 `@channel.io/bezier-tokens`의 CSS 변수/토큰을 참조한다(아래 §4).

---

## 2. 프론트엔드 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| 언어/프레임워크 | React 18 + TypeScript 5 | |
| 빌드 | Vite | 빠른 개발 서버, 번들 |
| UI | Bezier (`bezier-react`) | 컴포넌트 + 테마 |
| 라우팅 | React Router 6 | |
| 서버 상태 | TanStack Query 5 | REST 캐싱, 무한스크롤(메시지 이력) |
| 실시간 | socket.io-client 4 | WS 이벤트 구독/발행 |
| 클라이언트 상태 | Zustand | 세션/테마/활성 룸 등 |
| 폼 | react-hook-form | 온보딩·그룹 생성 폼 검증 |
| 로그인 | Kakao JS SDK | 카카오 인가 → 백엔드 토큰 교환 |
| 미디어 재생 | 네이티브 `<img>`/`<video>` + IntersectionObserver | 움짤 자동 재생 제어 |

> 상태관리는 TanStack Query(서버 데이터)를 1차로 두고, Zustand는 진짜 전역인 것(인증 토큰, 테마, 현재 열린 방 id, 소켓 연결 상태)만 담는다.

---

## 3. 프로젝트 셋업 (Claude Code 초기 작업)

### 3.1 부트스트랩

1. Vite + React + TS 프로젝트 생성.
2. 의존성 설치: `bezier-react`, `bezier-tokens`, `bezier-icons`, `react-router-dom`, `@tanstack/react-query`, `socket.io-client`, `zustand`, `react-hook-form`.
3. Bezier 토큰 CSS와 폰트(Pretendard 대체 시 Inter + Noto Sans KR)를 전역 로드.
4. 앱 루트에 Bezier 테마 프로바이더 + 라이트/다크 토글 컨텍스트 구성.
5. TanStack Query Provider, React Router, 소켓 컨텍스트 래핑.

### 3.2 루트 구성(개념 예시)

```tsx
// main.tsx
import "@channel.io/bezier-react/styles.css"; // 패키지 실제 엔트리에 맞춰 조정
import { BezierProvider } from "@channel.io/bezier-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

root.render(
  <BezierProvider> {/* themeName: light | dark */}
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </QueryClientProvider>
  </BezierProvider>
);
```

> Bezier의 프로바이더/스타일 임포트 경로는 설치된 버전의 실제 export에 맞춰 Claude Code가 확인 후 조정한다. 본 문서의 코드는 사용 의도를 보여주는 개념 예시다.

### 3.3 폰트

- 한국어 우선 스택: 라틴 **Inter**, 국문 **Noto Sans KR**. Bezier의 `--font-family-sans-kr` 토큰을 기본 본문 폰트로 사용한다.
- 굵기는 **regular(400) / bold(700) 2단계**만 쓴다. 중간 굵기를 임의로 추가하지 않는다.

---

## 4. 디자인 토큰 & 원칙 (제약 사항)

> 아래는 Claude Code가 지켜야 할 제약 요약이다. **수치는 참고용이며, 실제 코드는 hex/rgba/px 하드코딩 대신 Bezier 토큰(시맨틱/컴포넌트 토큰)을 호출**한다.

### 4.1 색 (3계층 토큰)

- 구조: **글로벌 원시값 → 시맨틱(라이트/다크) → 컴포넌트** 3계층.
- product-facing 색은 시맨틱/컴포넌트 토큰으로 호출: `--color-fill-*`, `--color-text-*`, `--color-border-*`, `--color-surface-*`, `bg-*`, `txt-*`.
- 글로벌 원시값(`grey-*`, `blue-*` 등)은 **새 role을 만들 때만** 직접 참조.
- **1차 액션 = blue 계열**(indigo-violet)로 통일. 11개 hue(navy/purple/pink/red/orange/yellow/olive/green/teal/cobalt/blue)는 상태·카테고리 인코딩용으로만 쓰고 의미 없이 흩뿌리지 않는다.
- 액센트 사용 규칙: **연한 20% 틴트를 배경(fill)** + **솔리드 hue를 텍스트·아이콘**으로. → 배너·태그·상태 칩이 "연한 틴트 위 진한 동색 글자/아이콘"으로 읽힌다.
- 텍스트·보더·딤은 고정 grey가 아니라 **alpha-black/alpha-white 위계**로 쌓는다(본문=black 85%, 보조=60%, 아이콘=40%, 보더=8% 등).
- 상태색 매핑(인택톡): info=blue, highlight=cobalt, success=green, warning=orange, critical=red.

### 4.2 타이포그래피

- 묶음 토큰 `--typography-size-NN`(font-size + line-height + letter-spacing)을 `Text` 컴포넌트로 조립해 쓴다.
- 크기 램프: 11/12/13/14/15/16/17/18/22/24/30/36(px 기준). 본문은 14~16, 큰 제목은 22~36.
- 큰 텍스트일수록 음수 자간(타이트). 한글·라틴 혼용 가독성 세팅.

### 4.3 간격 (4px 그리드)

- 레이아웃은 `Box`/`Center`/`Stack`(HStack/VStack) 프리미티브로 짠다.
- 간격은 4px 그리드 케이던스(4/6/10/16/32 등)를 따른다.

### 4.4 라운딩 (squircle 시그니처)

- 반경 램프: 2~44px. **주력은 8~12px** — 인풋/버튼 8, 배너/토스트/리스트아이템 12, 모달 20, 프로그레스/슬라이더 트랙 3.
- **부드러운 코너가 핵심 표면**(말풍선, 아바타, 큰 카드)은 `SmoothCornersBox`로 iOS식 연속 곡률(squircle)을 적용한다. 단순 `border-radius`로 흉내 내지 않는다 — Bezier의 시각 시그니처.

### 4.5 엘리베이션 / 깊이

- 컴포넌트는 `elevation-1`~`elevation-4`를 쓴다: 배너=2, 토스트/셀렉트/툴팁=3, 모달=4.
- 그림자는 라이트/다크가 토큰 레벨에서 분기된다 → **다크 분기를 누락하지 않는다.**

### 4.6 모션

- 마이크로 인터랙션은 **150ms `cubic-bezier(0.3,0,0,1)`** 범위에서 가볍게. 비활성은 `--opacity-disabled: 0.4`.

### 4.7 z-index 레이어

```
base 0 < floating 1 < overlay 1000 < modal 1100 < toast 1200 < tooltip 1300 < important 2000
```
띄우는 표면은 이 순서를 지켜 쌓는다.

### 4.8 아이콘

- UI 아이콘은 **`@channel.io/bezier-icons`(598종, outline/`-filled` 쌍)** 단일 출처. 24×24 `currentColor`.
- **유니코드/이모지를 UI 아이콘으로 쓰지 않는다.** 이모지는 콘텐츠(채팅 리액션, 메시지 본문)에서만.

---

## 5. 화면 설계 (Screen Spec)

> 각 화면은 백엔드 API/WS 명세(짝 문서)와 매핑된다. Bezier 컴포넌트는 공개된 59개 목록 안에서만 사용하고, 없는 역할은 §6의 전용 컴포넌트로 만든다.

### 5.1 로그인 (`/login`)
- 구성: 로고(`SmoothCornersBox` + 브랜드), 카카오 로그인 `Button`(`colorVariant`는 카카오 브랜드 컬러를 새 role로 추가), 안내 문구(`Text`).
- 미등록(403 `NOT_ALLOWED`) 응답 시 `Banner`(critical, red)로 "등록된 사용자만 이용할 수 있어요" 안내.
- 흐름: Kakao SDK 로그인 → 카카오 액세스 토큰 → `POST /auth/kakao` → 토큰 저장 → `isOnboarded`에 따라 분기.

### 5.2 온보딩 (`/onboarding`)
- 구성: 아바타 업로더(`Avatar` + 이미지 선택 → `POST /media/upload-url`), 닉네임 `TextField`(`size="m"`, `allowClear`), 상태메시지 `TextArea`, 완료 `Button`(primary).
- 검증: react-hook-form. 닉네임 필수, 에러는 `FormHelperText`(에러 메시지).
- 제출: `POST /profile`(최초). 성공 시 메인으로.

### 5.3 채팅 목록 / 메인 (`/`)
- **데스크톱 레이아웃**: 좌측 사이드(`NavGroup`/`NavItem` — 전체채팅/검색/설정) + 채팅방 리스트 + 우측 대화 패널(분할 뷰).
- **모바일 레이아웃**: 채팅방 리스트 단일 화면, 방 진입 시 대화방으로 라우팅(스택형).
- 채팅방 행: `ListItem`
  - 좌: `Avatar`(1:1) 또는 `AvatarGroup`(그룹).
  - 본문: 방 이름/상대 닉네임(`Text` bold) + 마지막 메시지 미리보기(`Text`, 미디어면 "사진"/"움짤" 라벨).
  - 우: 시간 + 미읽음 수 `Badge`(blue accent).
  - 활성 방은 `--color-fill-accent-blue` + `radius-6`.
- 데이터: `GET /rooms`(TanStack Query, `lastMessageAt` 정렬, `unreadCount` 포함). WS `message:new`/`message:read`/`room:created`/`room:updated` 수신 시 목록 무효화/갱신.
- 새 채팅 FAB: `AlphaFloatingButton`/`AlphaFloatingIconButton`(`elevation-3`) → 사용자 선택 모달.

### 5.4 대화방 (`/rooms/:roomId`)
- 헤더: 방 이름/`AvatarGroup`(그룹), 멤버 수, 설정 진입(그룹은 관리 메뉴). `Divider`로 본문과 구분.
- 메시지 영역: §6.1 메시지 말풍선(전용 컴포넌트). 무한스크롤(과거 방향) — `GET /rooms/:id/messages?cursor=`.
  - 내 메시지/상대 메시지 좌우 정렬, 그룹은 발신자 아바타+닉네임 표시.
  - 미읽음 수(카톡식): 메시지별 `readCount` 기반 "안 읽은 N" 표기.
  - 시스템 메시지(입장/퇴장/방 변경): 가운데 정렬 `Text`(neutral, 작게).
  - 삭제된 메시지(`deletedAt`): "삭제된 메시지입니다" placeholder.
- 입력 바: `TextField`/`TextArea`(자동 높이) + 미디어 첨부 `AlphaIconButton` + 전송 `Button`. 입력 중 `typing:start/stop` 발행.
- 전송: 낙관적 업데이트(`clientMessageId`) → WS `message:send` ack로 `seq` 확정. 실패 시 `Toast`(다크 바, 재시도 액션).
- 진입/스크롤 시 `POST /rooms/:id/read` + WS `message:read` 발행 → 미읽음 0.

### 5.5 그룹 생성 / 멤버 관리 (`Modal`)
- 생성: `Modal`(`Modal.Header/Body/Footer`, `radius-20`, `elevation-4`). 방 이름 `TextField`, 멤버 선택 — 검색 `TextField`(search) + 결과 `CheckableAvatar` 목록(다중 선택), 선택 요약 `AvatarGroup`.
- 제출: `POST /rooms`(type=GROUP). 1:1은 상대 1명 선택 시 기존 방 있으면 재사용.
- 관리(OWNER/ADMIN): 멤버 추가/추방(`POST`/`DELETE .../members`), 역할 변경(`PATCH .../members/:userId`), 방 이름/아바타 변경(`PATCH /rooms/:id`). 위험 동작은 `ConfirmModal`.
- 나가기: 본인 `DELETE .../members/me` → `ConfirmModal`로 확인.

### 5.6 사용자 검색 (`/search` 또는 모달)
- `TextField`(search, `allowClear`) → `GET /users/search?q=`(화이트리스트 범위). 결과 `ListItem` + `Avatar`. 선택 시 1:1 방 생성/이동.

### 5.7 설정 (`/settings`)
- 프로필 편집(`PATCH /profile`), 테마 토글(`Switch` 또는 `SegmentedControl`: 라이트/다크/시스템), 알림(`Switch`), 푸시 토큰 등록 상태, 로그아웃(`Button`, `ConfirmModal`).

---

## 6. 인택톡 전용 컴포넌트 (Bezier 미제공 영역)

Bezier에는 채팅 말풍선/미디어 자동재생 컴포넌트가 없다. 아래는 Bezier **프리미티브와 토큰으로 조립**해 만든다.

### 6.1 MessageBubble
- `SmoothCornersBox`(squircle) + `Text`(`typography-size-15` 본문). 내/외부 메시지 색·정렬 분기:
  - 내 메시지: `--color-fill-accent-blue`(또는 brand fill) 위 적절한 대비 텍스트.
  - 상대 메시지: `--color-surface-*`(중립 표면) + `--color-text-neutral`.
- 꼬리(tail)는 선택. 시간/읽음표시는 말풍선 옆 작은 `Text`(neutral-lighter).
- 답장(`replyToId`)은 인용 블록(작은 `SmoothCornersBox` + 원문 미리보기).

### 6.2 MediaMessage (움짤 자동 재생)
- 백엔드 `GET /media/:id` 메타의 `isAnimated`/`mimeType`/`thumbnailUrl`/`width`/`height` 사용.
- **자동 재생 규칙**:
  - `isAnimated=true`(image/gif, image/webp, image/apng, 무음 video/mp4 등): `IntersectionObserver`로 뷰포트 진입 시 재생, 이탈 시 정지.
  - GIF/WebP는 `<img>`(애니메이션 내장), 무음 mp4는 `<video autoplay loop muted playsinline>` + 가시성 토글.
  - 정적 이미지는 일반 표시.
- 컨테이너는 `radius-12`(작은 미디어) ~ squircle. 로딩은 `Spinner`/`AlphaLoader`, 실패는 재시도 UI.
- **자동 재생 정책(기본값)**: 모바일 데이터에서는 사용자 설정(기본: Wi-Fi에서만 자동재생, 그 외 탭하여 재생)을 두고 README에 명시.

### 6.3 ChatComposer
- 입력 바 래퍼: `TextArea`(자동 높이, Enter 전송 / Shift+Enter 줄바꿈) + 첨부/전송 버튼 + typing 디바운스.

### 6.4 기타
- 날짜 구분선(메시지 사이 "오늘"/"어제"), 미읽음 구분선, 스크롤-투-바텀 FAB 등은 `Box`/`Text`/`Divider`로 조립.

---

## 7. 실시간 연동 (Socket.IO Client)

- 연결: `wss://<host>/ws`, `auth: { token: accessToken }`. 토큰 만료 시 refresh 후 재연결.
- 구독(서버→클라이언트): `message:new`, `message:read`, `message:deleted`, `typing`, `presence`, `room:created`, `room:updated`, `error`.
- 발행(클라이언트→서버): `message:send`(ack로 `seq` 수신), `message:read`, `message:delete`, `typing:start/stop`, `room:join`.
- TanStack Query 연동: WS 이벤트 수신 시 해당 쿼리 캐시를 갱신(낙관적 업데이트 + 서버 확정 머지). 멱등 키 `clientMessageId`로 중복 방지.
- 재연결 시: 활성 방 메시지 이력 재동기화(`GET /rooms/:id/messages`), presence 복구.

---

## 8. 라우팅 & 상태

### 8.1 라우트
```
/login                 비로그인 전용
/onboarding            로그인 O + 온보딩 X (가드)
/                      메인(채팅 목록 / 데스크톱 분할 뷰)
/rooms/:roomId         대화방(모바일에서 단독 화면)
/search                사용자 검색
/settings              설정
```
- 가드: 미로그인 → `/login`, 로그인+미온보딩 → `/onboarding` 강제.

### 8.2 전역 상태(Zustand)
- `auth`: accessToken/refreshToken, 현재 사용자, isOnboarded.
- `ui`: theme(light/dark/system), 활성 roomId, 소켓 연결 상태.
- 나머지(방 목록, 메시지, 프로필 등)는 TanStack Query 캐시가 소유.

---

## 9. Do's and Don'ts (Bezier 준수)

**Do**
- 색은 시맨틱/컴포넌트 토큰으로 호출(`--color-fill-*`/`--color-text-*`/`bg-*`/`txt-*`). 글로벌 원시값은 새 role 정의 시에만.
- 라이트·다크를 **동시에 검수**한다(같은 화면을 양 테마로 확인). 시맨틱 토큰이 테마별로 분기되므로 다크 분기 누락 금지.
- 말풍선·아바타·큰 카드 등 부드러운 코너 표면은 `SmoothCornersBox`(및 아바타가 공유하는 shadow-spread 변수)로 squircle 적용.
- 폼 입력 상태는 `--state-input-active/default/error`로, 선택 컨트롤(체크박스·라디오·스위치)은 green accent로.
- 띄우는 표면은 z-index 순서(overlay→modal→toast→tooltip) 준수.
- 같은 역할에 alpha/legacy 변종이 있으면 **신규 코드는 안정 또는 alpha 라인** 사용(`Legacy*`는 지양).
- 모션은 150ms `cubic-bezier(0.3,0,0,1)` 범위, 비활성은 opacity 0.4.

**Don't**
- 색을 hex/rgba로 하드코딩하지 않는다 — 항상 토큰 이름으로.
- 라이트 단일 테마만 보고 색·그림자를 고정하지 않는다.
- squircle을 단순 `border-radius`로 흉내 내 `SmoothCornersBox`를 대체하지 않는다.
- 11개 hue를 의미 없이 흩뿌리지 않는다 — 1차 액션은 blue로 통일, 액센트는 상태/카테고리 인코딩에만.
- 공개 59개 목록에 없는 이름을 "Bezier 컴포넌트"처럼 만들지 않는다(전용 컴포넌트는 §6처럼 프리미티브로 조립).
- 유니코드/이모지를 UI 아이콘으로 쓰지 않는다 — `bezier-icons` 단일 출처. 이모지는 채팅 콘텐츠에서만.
- 챗봇 톤("~해보세요!")이나 마케팅 과장("혁신적", "차세대")으로 카피를 채우지 않는다 — 평이한 서술 톤.
- 채널톡의 B2B 메시징 도메인(상담 인박스, 팀 인박스, CRM 채널 등)을 이식하지 않는다 — 차용 대상은 시각 언어뿐.

---

## 10. 반응형 전략 (Bezier는 breakpoint 토큰 미발행)

> Bezier는 뷰포트 브레이크포인트를 토큰으로 제공하지 않는다. 반응형은 **앱 레이어 책임**이다.

- 앱 자체 브레이크포인트 정의(예: `mobile < 768px ≤ tablet < 1024px ≤ desktop`).
- 레이아웃 분기:
  - **데스크톱**: 사이드바 + 채팅 리스트 + 대화 패널 3분할(또는 2분할).
  - **모바일**: 단일 컬럼, 리스트 ↔ 대화방 스택 내비게이션.
- 밀도/터치 타깃: 폼·버튼은 사이즈 enum(`xl/l/m/xs`, 기본 `m`)으로 조절. 모바일은 터치 타깃 최소 44×44px 확보를 위해 더 큰 사이즈 선택.
- `Banner`의 폭 적응, `Modal`의 충돌 패딩 등 컴포넌트 내장 적응 기능을 활용.

---

## 11. 개발 단계 (Implementation Phases)

> 백엔드 Phase와 맞물려 진행한다. 각 단계 종료 시 빌드 + 라이트/다크 양 테마 확인.

### FE Phase 0 — 셋업
- Vite+React+TS, Bezier 설치, 토큰/폰트 로드, 테마 프로바이더, 라우터/Query/Socket 래핑, `/health` 대신 더미 화면.
- **완료 기준**: Bezier 컴포넌트 1개 렌더 + 라이트/다크 토글 동작.

### FE Phase 1 — 인증 & 온보딩 (백엔드 F1~F3)
- Kakao SDK 로그인, `/auth/kakao` 연동, 토큰 저장/리프레시, 라우트 가드.
- 온보딩 폼(아바타/닉네임/상태메시지) + `POST /profile`.
- 미등록 `Banner` 처리.
- **완료 기준**: 로그인→(미등록 안내 / 온보딩 / 메인) 분기 정확.

### FE Phase 2 — 채팅 목록 (백엔드 F4~F6)
- `GET /rooms` 목록, `ListItem`/`Avatar`/`AvatarGroup`/`Badge`, 데스크톱/모바일 레이아웃.
- **완료 기준**: 방 목록·미읽음 수 표시, 방 진입 라우팅.

### FE Phase 3 — 대화방 & 실시간 (백엔드 F4~F9)
- 메시지 무한스크롤, `MessageBubble`, `ChatComposer`, 소켓 연동(`message:send/new/read`, typing, presence), 낙관적 업데이트, 읽음 처리.
- 그룹 대화(발신자 표시, 시스템 메시지).
- **완료 기준**: 1:1·그룹 실시간 송수신, 미읽음/읽음 동기화.

### FE Phase 4 — 그룹 생성/관리 (백엔드 F5)
- 생성 `Modal`, 멤버 선택(`CheckableAvatar`), 관리(추가/추방/역할/이름), `ConfirmModal`.
- **완료 기준**: 그룹 생성·멤버/권한 변경·나가기 동작.

### FE Phase 5 — 미디어 & 움짤 (백엔드 F10)
- 업로드(presigned), `MediaMessage` 자동 재생(IntersectionObserver), 썸네일/로딩/실패 처리.
- **완료 기준**: GIF/움짤 뷰포트 자동재생·정지, 정책 토글.

### FE Phase 6 — 검색·설정·푸시·PWA (백엔드 F11~F13)
- 사용자 검색, 설정(테마/알림/로그아웃), 푸시 토큰 등록(웹 푸시/FCM), PWA(manifest/service worker).
- **완료 기준**: 검색→방 생성, 설정 반영, 설치형 PWA 동작.

### FE Phase 7 — 마감 & 접근성
- 키보드 내비/포커스 링, 대비(라이트/다크), 로딩/빈 상태/에러 상태 일관화, 반응형 QA.

---

## 12. 클로드 코드 작업 지침

1. **FE Phase 0부터 순서대로** 구현하고, 각 Phase 종료 시 빌드 + **라이트/다크 양 테마**를 함께 확인한다.
2. 설치된 Bezier 버전의 **실제 export/임포트 경로를 먼저 확인**하고, 본 문서의 개념 예시 코드를 그에 맞춰 조정한다.
3. **색·간격·반경·그림자·모션을 하드코딩하지 않는다.** 항상 Bezier 토큰(시맨틱/컴포넌트 토큰)을 참조한다.
4. UI는 **공개된 59개 Bezier 컴포넌트 우선**, 채팅 전용(말풍선/미디어 자동재생/컴포저)만 §6처럼 프리미티브로 조립한다.
5. 데이터·이벤트는 **백엔드 지시서 v2.0의 REST/WS 명세를 단일 출처**로 따른다(엔드포인트·페이로드 이름 일치).
6. 실시간은 낙관적 업데이트 + ack로 확정 + `clientMessageId` 멱등 처리. WS 이벤트로 TanStack Query 캐시를 갱신한다.
7. 아이콘은 `@channel.io/bezier-icons`만 사용(이모지 UI 금지). 이모지는 채팅 콘텐츠 한정.
8. 반응형 브레이크포인트는 앱 레이어에서 정의(데스크톱 분할 / 모바일 스택).
9. 접근성: 키보드 조작, 포커스 가시성, 양 테마 대비를 확보한다.
10. 모호한 정책(자동재생 기본값, 입력 단축키, 무한스크롤 페이지 크기)은 합리적 기본값을 적용하고 README에 명시한다.
11. **차용 범위 준수**: Bezier에서 가져오는 것은 시각 언어뿐이며, 채널톡 서비스 도메인 개념은 인택톡 도메인으로 번안하지 않고 아예 사용하지 않는다.

---

## 부록 A. 기능 ↔ Bezier 컴포넌트 매핑

| 인택톡 기능 | 주 사용 컴포넌트 |
|---|---|
| 카카오 로그인 | Button, Banner, Text |
| 온보딩 | Avatar, TextField, TextArea, FormControl/FormHelperText, Button |
| 채팅 목록 | ListItem, Avatar, AvatarGroup, Badge, NavGroup/NavItem, SectionLabel, AlphaFloatingButton |
| 대화방 | (전용)MessageBubble·MediaMessage·ChatComposer + TextArea, Avatar, Divider, Toast, Spinner |
| 그룹 생성/관리 | Modal, ConfirmModal, CheckableAvatar, TextField, AvatarGroup, Button |
| 검색 | TextField(search), ListItem, Avatar |
| 설정 | Switch, SegmentedControl, Select, ListItem, Button, ConfirmModal |
| 상태/알림 | Banner, Toast, Status, Tag, Tooltip |
| 로딩 | Spinner, AlphaLoader, ProgressBar |

> 부드러운 코너가 필요한 표면(말풍선·아바타·큰 카드)은 `SmoothCornersBox` squircle을 적용한다.

---

*문서 버전: v1.0 — 인택톡 프론트엔드 구축 지시서 (Bezier Design System 기반, React 웹)*