import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type { LocalMessage, Message, MessagesPage, Room } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'

type MessagesData = InfiniteData<MessagesPage, string | null>

/**
 * 메시지 캐시 머지 헬퍼 — WS 이벤트 핸들러와 낙관적 업데이트가 공유한다.
 * 캐시 구조: pages[0] = 최신 페이지, 각 페이지 items 는 seq 내림차순.
 */

/** clientMessageId 또는 id 가 일치하는 기존 항목이 있으면 교체, 없으면 최신 페이지 맨 앞에 추가 */
export function upsertMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(message.roomId), (data) => {
    if (!data) return data
    let replaced = false
    const pages = data.pages.map((page) => {
      const items = page.items.map((item) => {
        const sameById = item.id === message.id
        const sameByClientId =
          message.clientMessageId != null && item.clientMessageId === message.clientMessageId
        if (sameById || sameByClientId) {
          replaced = true
          return message
        }
        return item
      })
      return { ...page, items }
    })
    if (replaced) return { ...data, pages }
    const [first, ...rest] = pages
    if (!first) return data
    return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] }
  })
}

/** 낙관적 로컬 메시지 추가 (ack 전 sending 상태) */
export function addLocalMessage(queryClient: QueryClient, message: LocalMessage) {
  upsertMessage(queryClient, message)
}

/** 전송 실패 마킹 */
export function markMessageFailed(queryClient: QueryClient, roomId: string, clientMessageId: string) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(roomId), (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.clientMessageId === clientMessageId
            ? ({ ...item, localStatus: 'failed' } as LocalMessage)
            : item,
        ),
      })),
    }
  })
}

/** 로컬(실패) 메시지 제거 — 재시도 시 새 항목으로 다시 추가 */
export function removeLocalMessage(queryClient: QueryClient, roomId: string, clientMessageId: string) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(roomId), (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.clientMessageId !== clientMessageId),
      })),
    }
  })
}

/** message:deleted → placeholder 처리용 deletedAt 마킹 */
export function markMessageDeleted(queryClient: QueryClient, roomId: string, messageId: string) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(roomId), (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === messageId ? { ...item, deletedAt: new Date().toISOString() } : item,
        ),
      })),
    }
  })
}

/** message:read → 방 상세의 멤버 lastReadSeq 갱신 (메시지별 "안 읽은 N" 재계산 유도) */
export function applyReadReceipt(
  queryClient: QueryClient,
  roomId: string,
  userId: string,
  lastReadSeq: number,
) {
  queryClient.setQueryData<Room>(queryKeys.room(roomId), (room) => {
    if (!room?.members) return room
    return {
      ...room,
      members: room.members.map((member) =>
        member.userId === userId && member.lastReadSeq < lastReadSeq
          ? { ...member, lastReadSeq }
          : member,
      ),
    }
  })
}

/** 방 목록 캐시에 단일 방 upsert (room:created / room:updated) */
export function upsertRoom(queryClient: QueryClient, room: Room) {
  queryClient.setQueryData<Room[]>(queryKeys.rooms, (rooms) => {
    if (!rooms) return rooms
    const exists = rooms.some((r) => r.id === room.id)
    const next = exists ? rooms.map((r) => (r.id === room.id ? { ...r, ...room } : r)) : [room, ...rooms]
    return sortRoomsByLastMessage(next)
  })
  queryClient.setQueryData<Room>(queryKeys.room(room.id), (prev) =>
    prev ? { ...prev, ...room, members: room.members ?? prev.members } : room,
  )
}

/** message:new → 방 목록의 미리보기/정렬/미읽음 갱신 */
export function applyNewMessageToRoomList(
  queryClient: QueryClient,
  message: Message,
  options: { isActiveRoom: boolean; isMine: boolean },
) {
  queryClient.setQueryData<Room[]>(queryKeys.rooms, (rooms) => {
    if (!rooms) return rooms
    const next = rooms.map((room) => {
      if (room.id !== message.roomId) return room
      return {
        ...room,
        lastMessage: {
          id: message.id,
          type: message.type,
          content: message.content,
          media: message.media,
          senderId: message.senderId,
          createdAt: message.createdAt,
        },
        lastMessageAt: message.createdAt,
        unreadCount:
          options.isActiveRoom || options.isMine ? room.unreadCount : room.unreadCount + 1,
      }
    })
    return sortRoomsByLastMessage(next)
  })
}

/** 내 읽음 처리 후 방 목록 미읽음 0 반영 */
export function clearRoomUnread(queryClient: QueryClient, roomId: string) {
  queryClient.setQueryData<Room[]>(queryKeys.rooms, (rooms) =>
    rooms?.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)),
  )
}

export function sortRoomsByLastMessage(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => {
    const ta = a.lastMessageAt ?? a.createdAt
    const tb = b.lastMessageAt ?? b.createdAt
    return tb.localeCompare(ta)
  })
}
