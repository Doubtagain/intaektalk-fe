/**
 * 백엔드 응답(평면 + id 참조) → FE 도메인 타입(중첩) 어댑터.
 *
 * 백엔드는 멤버를 평면으로(닉네임/아바타 직접 필드), 메시지/방은 senderId·mediaId·preview 같은
 * 축약형으로 내려준다. 화면 코드는 중첩 형태(member.user, message.sender 등)를 기대하므로
 * REST(endpoints) 와 WS(SocketProvider) 경계에서 이 어댑터로 일관되게 변환한다.
 */

import type {
  MediaMeta,
  MediaRes,
  MemberRole,
  Message,
  MessageRes,
  MessageType,
  ProfileRes,
  Room,
  RoomMember,
  RoomMemberRes,
  RoomType,
  RoomView,
  User,
} from './types'

/** 평면 멤버 → 중첩 RoomMember. lastReadSeq 는 백엔드 미제공이라 0 (미읽음 N 은 message.readCount 기반). */
export function mapMember(m: RoomMemberRes): RoomMember {
  return {
    userId: m.userId,
    role: m.role as MemberRole,
    lastReadSeq: 0,
    joinedAt: '',
    user: {
      id: m.userId,
      nickname: m.nickname ?? '알 수 없음',
      avatarUrl: m.avatarUrl ?? null,
      statusMessage: null,
      isOnboarded: true,
    },
  }
}

export function mapRoom(r: RoomView): Room {
  return {
    id: r.id,
    type: r.type as RoomType,
    name: r.name,
    avatarUrl: r.avatarUrl,
    memberCount: r.members?.length ?? 0,
    members: (r.members ?? []).map(mapMember),
    // 백엔드 lastMessage 는 { seq, type, preview, createdAt } — preview(이미 라벨 처리된 문자열)를 content 로 싣는다.
    lastMessage: r.lastMessage
      ? {
          id: '',
          type: r.lastMessage.type as MessageType,
          content: r.lastMessage.preview,
          media: null,
          senderId: '',
          createdAt: r.lastMessage.createdAt,
        }
      : null,
    lastMessageAt: r.lastMessageAt ?? null,
    unreadCount: r.unreadCount ?? 0,
    createdAt: r.createdAt,
  }
}

/** 평면 메시지(senderId/mediaId 만) → FE Message. sender/media/replyTo 는 화면에서 멤버맵·조회로 해석. */
export function mapMessage(m: MessageRes): Message {
  return {
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    sender: null,
    type: m.type as MessageType,
    content: m.content,
    media: null,
    mediaId: m.mediaId ?? null,
    replyToId: m.replyToId ?? null,
    replyTo: null,
    seq: m.seq,
    clientMessageId: m.clientMessageId ?? null,
    createdAt: m.createdAt,
    deletedAt: m.deletedAt ?? null,
    readCount: m.readCount,
    editedAt: m.editedAt ?? null,
  }
}

export function mapMedia(m: MediaRes): MediaMeta {
  return {
    id: m.mediaId,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    mimeType: m.mimeType,
    width: m.width,
    height: m.height,
    isAnimated: m.isAnimated,
    size: 0,
  }
}

/** ProfileResponse(userId, onboardedAt) → FE User. 호출부는 기존 user 와 병합해 isAdmin/kakaoId 를 보존한다. */
export function mapProfileToUser(p: ProfileRes): User {
  return {
    id: p.userId,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl ?? null,
    statusMessage: p.statusMessage ?? null,
    isOnboarded: p.onboardedAt != null,
  }
}
