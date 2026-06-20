import { apiClient, rawPost, unwrap } from './client'
import type {
  AuthResponse,
  AuthTokens,
  CreateProfileDto,
  CreateRoomDto,
  CreateUploadUrlDto,
  MediaMeta,
  MemberRole,
  Message,
  MessagesPage,
  Page,
  RegisterTokenDto,
  Room,
  SendMessageDto,
  UpdateProfileDto,
  UpdateRoomDto,
  UploadUrlResponse,
  User,
} from './types'

export const MESSAGES_PAGE_SIZE = 50

// ---------- Auth ----------

export const authApi = {
  /**
   * 카카오 인가 코드 → 인택톡 토큰 교환. 코드→카카오토큰 교환은 백엔드가 수행한다.
   * (백엔드 DTO 가 { code, redirectUri } 로 전환되기 전까지 rawPost 로 호출 — 전환 후 gen:api 재생성하면
   *  apiClient.POST('/api/v1/auth/kakao', ...) 로 바꿀 수 있다.) 미등록 사용자는 403 NOT_ALLOWED.
   */
  loginWithKakao: (code: string, redirectUri: string) =>
    rawPost<AuthResponse>('/auth/kakao', { code, redirectUri }),
  refresh: (refreshToken: string) =>
    apiClient.POST('/api/v1/auth/refresh', { body: { refreshToken } }).then(unwrap<AuthTokens>),
  logout: (refreshToken: string) =>
    apiClient.POST('/api/v1/auth/logout', { body: { refreshToken } }).then(unwrap<void>),
  /** 현재 사용자 + 온보딩 상태 */
  me: (signal?: AbortSignal) =>
    apiClient.GET('/api/v1/auth/me', { signal }).then(unwrap<User>),
}

// ---------- Profile ----------

export const profileApi = {
  /** 온보딩 최초 제출 */
  create: (body: CreateProfileDto) =>
    apiClient.POST('/api/v1/profile', { body }).then(unwrap<User>),
  update: (body: UpdateProfileDto) =>
    apiClient.PATCH('/api/v1/profile', { body }).then(unwrap<User>),
}

// ---------- Rooms ----------

export const roomsApi = {
  list: (cursor?: string | null, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/rooms', {
        params: { query: { limit: 100, ...(cursor ? { cursor } : {}) } },
        signal,
      })
      .then(unwrap<Page<Room>>),
  detail: (roomId: string, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/rooms/{roomId}', { params: { path: { roomId } }, signal })
      .then(unwrap<Room>),
  create: (body: CreateRoomDto) =>
    apiClient.POST('/api/v1/rooms', { body }).then(unwrap<Room>),
  update: (roomId: string, body: UpdateRoomDto) =>
    apiClient
      .PATCH('/api/v1/rooms/{roomId}', { params: { path: { roomId } }, body })
      .then(unwrap<Room>),
  /** 진입/스크롤 시 읽음 처리 */
  markRead: (roomId: string, lastReadSeq: number) =>
    apiClient
      .POST('/api/v1/rooms/{roomId}/read', { params: { path: { roomId } }, body: { lastReadSeq } })
      .then(unwrap<void>),

  addMembers: (roomId: string, userIds: string[]) =>
    apiClient
      .POST('/api/v1/rooms/{roomId}/members', { params: { path: { roomId } }, body: { userIds } })
      .then(unwrap<Room>),
  changeRole: (roomId: string, userId: string, role: MemberRole) =>
    apiClient
      .PATCH('/api/v1/rooms/{roomId}/members/{userId}', {
        params: { path: { roomId, userId } },
        body: { role },
      })
      .then(unwrap<void>),
  removeMember: (roomId: string, userId: string) =>
    apiClient
      .DELETE('/api/v1/rooms/{roomId}/members/{userId}', { params: { path: { roomId, userId } } })
      .then(unwrap<void>),
  /** 방 나가기 = 본인 userId 로 멤버 삭제 (백엔드에 /members/me 는 없다) */
  leave: (roomId: string, myUserId: string) =>
    apiClient
      .DELETE('/api/v1/rooms/{roomId}/members/{userId}', {
        params: { path: { roomId, userId: myUserId } },
      })
      .then(unwrap<void>),
}

// ---------- Messages ----------

export const messagesApi = {
  /** seq 내림차순. cursor = 이전 페이지의 nextCursor (더 과거 방향) */
  list: (roomId: string, cursor?: string | null, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/rooms/{roomId}/messages', {
        params: {
          path: { roomId },
          query: { limit: MESSAGES_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        },
        signal,
      })
      .then(unwrap<MessagesPage>),
  /** REST 폴백 전송 (기본 전송은 WebSocket) */
  send: (roomId: string, body: SendMessageDto) =>
    apiClient
      .POST('/api/v1/rooms/{roomId}/messages', { params: { path: { roomId } }, body })
      .then(unwrap<Message>),
  remove: (roomId: string, messageId: string) =>
    apiClient
      .DELETE('/api/v1/rooms/{roomId}/messages/{messageId}', {
        params: { path: { roomId, messageId } },
      })
      .then(unwrap<void>),
}

// ---------- Users ----------

export const usersApi = {
  /** 화이트리스트 범위 검색 (커서 페이지네이션) */
  search: (q: string, cursor?: string | null, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/users/search', {
        params: { query: { q, limit: 50, ...(cursor ? { cursor } : {}) } },
        signal,
      })
      .then(unwrap<Page<User>>),
  profile: (userId: string, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/users/{userId}/profile', { params: { path: { userId } }, signal })
      .then(unwrap<User>),
}

// ---------- Media ----------

export const mediaApi = {
  meta: (mediaId: string, signal?: AbortSignal) =>
    apiClient
      .GET('/api/v1/media/{mediaId}', { params: { path: { mediaId } }, signal })
      .then(unwrap<MediaMeta>),
  createUploadUrl: (body: CreateUploadUrlDto) =>
    apiClient.POST('/api/v1/media/upload-url', { body }).then(unwrap<UploadUrlResponse>),
  /** presigned PUT 업로드 후 호출해 객체 존재 확정(READY) */
  complete: (mediaId: string) =>
    apiClient
      .POST('/api/v1/media/{mediaId}/complete', { params: { path: { mediaId } } })
      .then(unwrap<MediaMeta>),
  /** presigned URL 로 파일 본문 업로드 */
  uploadFile: async (uploadUrl: string, file: File) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!res.ok) throw new Error(`업로드 실패 (${res.status})`)
  },
}

// ---------- Push (FCM) ----------

export const pushApi = {
  register: (body: RegisterTokenDto) =>
    apiClient.POST('/api/v1/push/tokens', { body }).then(unwrap<{ id?: string; tokenId?: string }>),
  remove: (tokenId: string) =>
    apiClient
      .DELETE('/api/v1/push/tokens/{tokenId}', { params: { path: { tokenId } } })
      .then(unwrap<void>),
}
