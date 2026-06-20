/**
 * 인택톡 도메인 타입.
 *
 * 요청 DTO/경로/파라미터는 백엔드 OpenAPI(`schema.d.ts`, `npm run gen:api`)에서 생성된 타입을
 * 단일 출처로 쓴다. 단, 백엔드 스펙이 **응답 본문을 타입화하지 않으므로**(`{type: object}`),
 * 아래 엔티티/응답 타입은 손으로 정의한 best-effort 다 — 백엔드가 응답 스키마를 추가하면
 * 이 파일을 줄이고 schema.d.ts 로 옮긴다.
 *
 * 모든 시각은 ISO 8601 문자열.
 */

import type { components } from './schema'

// 생성된 요청 DTO 재노출 (요청 바디는 codegen 이 단일 출처)
export type KakaoLoginDto = components['schemas']['KakaoLoginDto']
export type CreateProfileDto = components['schemas']['CreateProfileDto']
export type UpdateProfileDto = components['schemas']['UpdateProfileDto']
export type CreateRoomDto = components['schemas']['CreateRoomDto']
export type UpdateRoomDto = components['schemas']['UpdateRoomDto']
export type AddMembersDto = components['schemas']['AddMembersDto']
export type UpdateMemberRoleDto = components['schemas']['UpdateMemberRoleDto']
export type SendMessageDto = components['schemas']['SendMessageDto']
export type CreateUploadUrlDto = components['schemas']['CreateUploadUrlDto']
export type RegisterTokenDto = components['schemas']['RegisterTokenDto']
export type DevicePlatform = NonNullable<components['schemas']['DeviceDto']['platform']>

export type RoomType = 'DIRECT' | 'GROUP'
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'

/** 백엔드 메시지 타입. SYSTEM 은 입장/퇴장 등 서버 생성 메시지(전송 불가). */
export type MessageType = 'TEXT' | 'IMAGE' | 'GIF' | 'VIDEO' | 'FILE' | 'SYSTEM'
/** 클라이언트가 전송할 수 있는 타입 (SYSTEM 제외) */
export type SendableMessageType = Exclude<MessageType, 'SYSTEM'>
/** 미디어로 렌더링하는 타입 */
export const MEDIA_MESSAGE_TYPES = ['IMAGE', 'GIF', 'VIDEO', 'FILE'] as const
export function isMediaType(type: MessageType): boolean {
  return (MEDIA_MESSAGE_TYPES as readonly string[]).includes(type)
}

export interface User {
  id: string
  nickname: string
  avatarUrl: string | null
  statusMessage: string | null
  isOnboarded: boolean
}

export interface RoomMember {
  userId: string
  role: MemberRole
  /** 이 멤버가 읽은 마지막 메시지 seq. 메시지별 "안 읽은 N" 계산 기준. */
  lastReadSeq: number
  joinedAt: string
  user: User
}

export interface MediaMeta {
  id: string
  url: string
  thumbnailUrl: string | null
  mimeType: string
  width: number | null
  height: number | null
  /** GIF/WebP/APNG/무음 mp4 등 움짤 여부 — 자동 재생 판단 기준 */
  isAnimated: boolean
  size: number
}

export interface MessagePreview {
  id: string
  type: MessageType
  content: string | null
  media: MediaMeta | null
  senderId: string
  createdAt: string
}

export interface Room {
  id: string
  type: RoomType
  /** GROUP 방 이름. DIRECT 는 null — 상대 닉네임 표시 */
  name: string | null
  avatarUrl: string | null
  memberCount: number
  members?: RoomMember[]
  lastMessage: MessagePreview | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
}

export interface Message {
  id: string
  roomId: string
  senderId: string
  sender: User | null
  type: MessageType
  content: string | null
  media: MediaMeta | null
  replyToId: string | null
  replyTo: MessagePreview | null
  /** 방 내 단조 증가 시퀀스. 정렬·읽음 처리 기준 */
  seq: number
  /** 송신 시 클라이언트가 발급한 멱등 키 */
  clientMessageId: string | null
  createdAt: string
  deletedAt: string | null
}

/** 낙관적 업데이트 중인 로컬 메시지 상태 */
export type LocalMessageStatus = 'sending' | 'failed'

export interface LocalMessage extends Message {
  localStatus?: LocalMessageStatus
}

// ---------- Auth ----------

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}

// ---------- 커서 페이지네이션 ----------

/** 백엔드 목록 응답 공통 형태 (rooms / messages / users.search) */
export interface Page<T> {
  items: T[]
  /** 다음(더 과거) 페이지 커서. null 이면 끝 */
  nextCursor: string | null
}

export type MessagesPage = Page<Message>

// ---------- 업로드 ----------

export interface UploadUrlResponse {
  mediaId: string
  /** presigned PUT URL */
  uploadUrl: string
}

// ---------- API 에러 ----------

/** 백엔드 에러 바디: { code, message, details } (statusCode 는 HTTP 상태로 보강) */
export interface ApiErrorBody {
  code: string
  message: string
  statusCode?: number
  details?: unknown
}

// ---------- Socket.IO 이벤트 (서버 → 클라이언트) ----------

export interface ServerToClientEvents {
  'message:new': (message: Message) => void
  'message:read': (payload: { roomId: string; userId: string; lastReadSeq: number }) => void
  'message:deleted': (payload: { roomId: string; messageId: string }) => void
  typing: (payload: { roomId: string; userId: string; isTyping: boolean }) => void
  presence: (payload: { userId: string; online: boolean }) => void
  'room:created': (room: Room) => void
  'room:updated': (room: Room) => void
  error: (payload: ApiErrorBody) => void
}

// ---------- Socket.IO 이벤트 (클라이언트 → 서버) ----------

export interface SendMessageBody {
  roomId: string
  type: SendableMessageType
  content?: string
  mediaId?: string
  replyToId?: string
  clientMessageId: string
}

export type SendMessageAck =
  | { ok: true; message: Message }
  | { ok: false; error: ApiErrorBody }

export interface ClientToServerEvents {
  'message:send': (body: SendMessageBody, ack: (res: SendMessageAck) => void) => void
  'message:read': (payload: { roomId: string; seq: number }) => void
  'message:delete': (payload: { roomId: string; messageId: string }) => void
  'typing:start': (payload: { roomId: string }) => void
  'typing:stop': (payload: { roomId: string }) => void
  'room:join': (payload: { roomId: string }) => void
}
