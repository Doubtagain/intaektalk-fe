# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

인택톡(Intaektok) frontend — Kakao-login messenger SPA/PWA. React 18 + TypeScript (strict) + Vite, on the Bezier design system. UI strings, comments, and commit messages are in Korean.

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # tsc -b && vite build  ← typecheck runs first, so type errors fail the build
npm run typecheck    # tsc -b only
npm run preview      # serve the production build locally
npm run gen:api      # regenerate src/lib/api/schema.d.ts from local src/lib/api/openapi.json
npm run gen:api:remote  # regenerate schema.d.ts from the deployed backend (https://api.khmin.cloud/docs-json)
```

- **No test runner is configured** — there are no automated tests. Verification is `npm run build` (full typecheck) plus manual checks.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` on: unused imports/vars **fail the build**, not just lint.
- Import alias `@/*` → `src/*` (set in both `vite.config.ts` and `tsconfig.app.json`).
- After any backend API change, run `npm run gen:api:remote` and re-typecheck — the generated types will surface contract drift at compile time.

## Architecture

### API layer (`src/lib/api/`) — the spine
- `schema.d.ts` is **generated** by openapi-typescript. Never hand-edit it; regenerate with `gen:api:remote`. It is the source of truth for request DTOs, paths, and response schemas.
- `types.ts` holds **hand-written FE domain types** (e.g. flat `User`, `Room`, `Message`) plus re-exports of generated DTOs. The backend response shapes do **not** always match the FE domain types, so mapper functions bridge them — e.g. `mapMeToUser` in `endpoints.ts` flattens the nested `MeResponse.profile` into the flat `User`. When a backend response shape changes, fix the mapper, not just a cast.
- `client.ts` wraps the openapi-fetch `apiClient` with `authFetch`: injects the Bearer token from `authStore`, and on a 401 performs a **single-flight `/auth/refresh` + one retry**. `unwrap<T>()` converts openapi-fetch's `{data, error}` result into a throw-based contract (`throw ApiError`). `rawPost` exists for endpoints whose DTOs aren't in the generated types yet (e.g. `/auth/kakao`).
- `endpoints.ts` exposes per-domain API objects (`authApi`, `profileApi`, `roomsApi`, `messagesApi`, `usersApi`, `mediaApi`, `pushApi`, `adminApi`). **Screens/hooks call these, never `apiClient` directly.**

### State: server vs client
- **TanStack Query** owns all server state (REST cache, message infinite-scroll). Query keys come from the factory in `src/lib/query/keys.ts` — this factory is the shared contract between WebSocket handlers and screens; use it for both reads and invalidation.
- **Zustand** owns client state: `authStore` (tokens + user, **persisted to localStorage** under `intaektalk-auth`), `uiStore` (active room, socket-connected flag), `presenceStore` (online/typing — volatile).

### Realtime (`src/lib/socket/`)
`SocketProvider` holds a Socket.IO connection to the `VITE_WS_URL` origin with Engine.IO **path** `/ws` while authenticated — `io(VITE_WS_URL, { path: '/ws' })`. The backend gateway mounts `/ws` as the Engine.IO path (not a namespace), so connecting to `io(.../ws)` would target the wrong handshake path and silently never connect. Auth uses a callback returning the latest token, so reconnects pick up refreshed tokens. **Inbound server events are merged into the TanStack Query cache** via the helpers in `cache.ts` (`upsertMessage`, `applyReadReceipt`, `upsertRoom`, …) keyed by `queryKeys`. On reconnect it re-syncs the room list and rejoins the active room. Outbound `message:send` confirms optimistic updates via the ack's `seq` and a `clientMessageId` idempotency key.

### Routing & auth (`src/routes/`)
`createBrowserRouter` in `router.tsx`. All guards in `guards.tsx` read `authStore`: `RequireAuth` (token), `RequireOnboarded` (`user.isOnboarded`), `RequireAdmin` (`user.isAdmin`), plus reverse guards `PublicOnly`/`OnboardingOnly`. The main app nests `RequireAuth → RequireOnboarded → AppLayout`; `/admin` adds `RequireAdmin`. Guards are **client-side UX only — the backend enforces access** (admin endpoints return 403 for non-admins).

Auth flow: Kakao JS SDK **v2 authorization-code** — `Auth.authorize({ redirectUri: <origin>/login })` → returns to `/login?code=` → `POST /auth/kakao { code, redirectUri }` (backend does the Kakao token exchange). Unregistered/blocked users get **403 `NOT_ALLOWED`** (whitelist). `isAdmin` is derived server-side (backend `ADMIN_USER_IDS`) and surfaced on `GET /auth/me`. `useSessionBootstrap` calls `/auth/me` on load to sync user + `isAdmin`; `useKakaoLogin` re-fetches `/me` right after login to enrich the session.

### Layout
`AppLayout` is the responsive shell: mobile = single column (RoomListPane at `/`, else `<Outlet/>`); desktop/tablet = 3-pane `[NavRail][RoomListPane][Outlet]`. NavRail entries are gated (the admin entry renders only when `user.isAdmin`).

### Reference docs
`instrument.md` (구현 지시서) and `design.md` (디자인 핸드오프) are the spec sources. README's "정책 기본값" pins behavioral defaults (Enter-to-send with Korean-IME guard, gif autoplay default "Wi-Fi only", message page size 50).

## Conventions & gotchas

- **Design tokens only.** All color/radius/shadow/motion must use Bezier semantic tokens (component prop color names or token CSS vars) — no hex/rgba, no arbitrary px-radius or ms. Only spacing (padding/margin/gap) uses raw 4px-grid numbers. Exceptions: the Kakao brand button colors and the PWA manifest/icon hex.
- **`VITE_*` env vars are inlined at BUILD time.** `.env` is gitignored (`.env*` except `.env.example`), so production values live only in the Cloudflare Pages dashboard. Changing a value requires a **redeploy**, not just a dashboard edit. A blank `VITE_KAKAO_JS_KEY` at build time is the usual cause of the "카카오 로그인 설정을 불러오지 못했습니다" banner.
- The backend (NestJS + Prisma) lives in the sibling directory `../intaektalk`. `gen:api:remote` pulls from the **deployed** API, which can lag the local backend code.

## Deployment (Cloudflare Pages)

- Build `npm run build`, output `dist`, Node 22 (`.node-version`). Framework preset: Vite.
- Set `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_KAKAO_JS_KEY`, `VITE_VAPID_PUBLIC_KEY` in the dashboard for **Production and Preview separately**.
- `.npmrc` sets `legacy-peer-deps=true` — required so CF's `npm ci` passes (openapi-typescript@7's peer wants typescript@5 but the project uses typescript@6).
- **No `_redirects` file** — SPA routing relies on Cloudflare's automatic fallback (serves `index.html` when there's no `404.html`). Adding `/* /index.html 200` can be rejected as an infinite loop.
- `public/_headers` controls caching (sw.js/manifest `no-cache`, `/assets/*` immutable). The service worker (`public/sw.js`) registers in production builds only.
- Post-deploy: register the deploy domain + `https://<domain>/login` redirect URI in the Kakao Developers console, and ensure the backend allows the Pages origin in REST CORS and Socket.IO cors.
