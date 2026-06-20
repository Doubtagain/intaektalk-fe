import { useCallback, useEffect, useRef } from 'react'

import { useToast } from '@channel.io/bezier-react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'

import { mediaApi } from '@/lib/api/endpoints'
import { isMediaType } from '@/lib/api/types'
import type {
  LocalMessage,
  MediaMeta,
  MessagesPage,
  SendableMessageType,
  SendMessageBody,
} from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'
import {
  addLocalMessage,
  confirmLocalMessage,
  markMessageFailed,
  removeLocalMessage,
} from '@/lib/socket/cache'
import { useSocket } from '@/lib/socket/SocketProvider'
import { useAuthStore } from '@/stores/authStore'

const SEND_ACK_TIMEOUT_MS = 10_000

/** 낙관적 미리보기에서 움짤로 취급할 MIME — 로컬 미리보기 용도라 정확하지 않아도 된다 */
const LOCAL_ANIMATED_TYPES = ['image/gif', 'image/apng', 'video/mp4']

/** MIME → 백엔드 메시지 타입 */
function mediaTypeFromMime(mime: string): SendableMessageType {
  if (mime === 'image/gif') return 'GIF'
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.startsWith('video/')) return 'VIDEO'
  return 'FILE'
}

interface PendingMedia {
  file: File
  objectUrl: string
}

/**
 * 메시지 전송 훅 — 낙관적 업데이트 + WS ack 확정 + clientMessageId 멱등 처리.
 * - 텍스트: addLocalMessage(sending) → message:send → ack ok 시 서버 메시지로 교체.
 * - 미디어: ObjectURL 미리보기 말풍선 → presigned 업로드 → message:send.
 * - 실패(ack ok:false / 10초 타임아웃 / 소켓 없음): markMessageFailed + 에러 토스트.
 * 방 목록 갱신은 message:new 핸들러(SocketProvider)가 담당하므로 여기서는 하지 않는다.
 */
export function useSendMessage(roomId: string | undefined) {
  const queryClient = useQueryClient()
  const socket = useSocket()
  const toast = useToast()
  const pendingMediaRef = useRef(new Map<string, PendingMedia>())

  // 언마운트 시 미리보기 ObjectURL 정리
  useEffect(() => {
    const pending = pendingMediaRef.current
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.objectUrl))
      pending.clear()
    }
  }, [])

  const failSend = useCallback(
    (targetRoomId: string, clientMessageId: string) => {
      markMessageFailed(queryClient, targetRoomId, clientMessageId)
      toast.addToast('전송에 실패했습니다', { preset: 'error' })
    },
    [queryClient, toast],
  )

  /** 현재 캐시 기준 다음 seq (낙관적 정렬용 — ack 시 서버 seq 로 교체된다) */
  const getNextSeq = useCallback(
    (targetRoomId: string) => {
      const data = queryClient.getQueryData<InfiniteData<MessagesPage, string | null>>(
        queryKeys.messages(targetRoomId),
      )
      let max = 0
      data?.pages.forEach((page) =>
        page.items.forEach((item) => {
          if (item.seq > max) max = item.seq
        }),
      )
      return max + 1
    },
    [queryClient],
  )

  const settlePendingMedia = useCallback((clientMessageId: string) => {
    const pending = pendingMediaRef.current.get(clientMessageId)
    if (pending) {
      URL.revokeObjectURL(pending.objectUrl)
      pendingMediaRef.current.delete(clientMessageId)
    }
  }, [])

  const emitSend = useCallback(
    (body: SendMessageBody) => {
      if (!socket) {
        failSend(body.roomId, body.clientMessageId)
        return
      }
      let settled = false
      const timer = setTimeout(() => {
        settled = true
        failSend(body.roomId, body.clientMessageId)
      }, SEND_ACK_TIMEOUT_MS)
      socket.emit('message:send', body, (res) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (res.ok) {
          settlePendingMedia(body.clientMessageId)
          // ack 로 낙관적 항목을 확정(서버 id/seq/createdAt). 동일 메시지는 message:new 로도 와서 멱등 교체된다.
          confirmLocalMessage(queryClient, body.roomId, body.clientMessageId, {
            id: res.id,
            seq: res.seq,
            createdAt: res.createdAt,
          })
        } else {
          failSend(body.roomId, body.clientMessageId)
        }
      })
    },
    [socket, queryClient, failSend, settlePendingMedia],
  )

  const addOptimistic = useCallback(
    (
      targetRoomId: string,
      partial: Pick<LocalMessage, 'type' | 'content' | 'media' | 'replyToId'>,
      clientMessageId: string,
    ): boolean => {
      const me = useAuthStore.getState().user
      if (!me) return false
      const local: LocalMessage = {
        id: `local-${clientMessageId}`,
        roomId: targetRoomId,
        senderId: me.id,
        sender: me,
        type: partial.type,
        content: partial.content,
        media: partial.media,
        replyToId: partial.replyToId,
        replyTo: null,
        seq: getNextSeq(targetRoomId),
        clientMessageId,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        localStatus: 'sending',
      }
      addLocalMessage(queryClient, local)
      return true
    },
    [queryClient, getNextSeq],
  )

  const sendText = useCallback(
    (content: string, replyToId?: string) => {
      if (!roomId) return
      const trimmed = content.trim()
      if (!trimmed) return
      const clientMessageId = crypto.randomUUID()
      const added = addOptimistic(
        roomId,
        { type: 'TEXT', content: trimmed, media: null, replyToId: replyToId ?? null },
        clientMessageId,
      )
      if (!added) return
      emitSend({
        roomId,
        type: 'TEXT',
        content: trimmed,
        ...(replyToId ? { replyToId } : {}),
        clientMessageId,
      })
    },
    [roomId, addOptimistic, emitSend],
  )

  const sendMedia = useCallback(
    async (file: File) => {
      if (!roomId) return
      const clientMessageId = crypto.randomUUID()
      const objectUrl = URL.createObjectURL(file)
      pendingMediaRef.current.set(clientMessageId, { file, objectUrl })
      const msgType = mediaTypeFromMime(file.type)
      const localMedia: MediaMeta = {
        id: `local-media-${clientMessageId}`,
        url: objectUrl,
        thumbnailUrl: null,
        mimeType: file.type,
        width: null,
        height: null,
        isAnimated: LOCAL_ANIMATED_TYPES.includes(file.type),
        size: file.size,
      }
      const added = addOptimistic(
        roomId,
        { type: msgType, content: null, media: localMedia, replyToId: null },
        clientMessageId,
      )
      if (!added) return
      try {
        const { mediaId, uploadUrl } = await mediaApi.createUploadUrl({
          mimeType: file.type,
          byteSize: file.size,
        })
        await mediaApi.uploadFile(uploadUrl, file)
        // presigned PUT 후 백엔드에 객체 존재 확정(READY)
        await mediaApi.complete(mediaId)
        emitSend({ roomId, type: msgType, mediaId, clientMessageId })
      } catch {
        failSend(roomId, clientMessageId)
      }
    },
    [roomId, addOptimistic, emitSend, failSend],
  )

  /** 실패한 로컬 메시지 삭제 */
  const discard = useCallback(
    (message: LocalMessage) => {
      if (!roomId || !message.clientMessageId) return
      removeLocalMessage(queryClient, roomId, message.clientMessageId)
      settlePendingMedia(message.clientMessageId)
    },
    [roomId, queryClient, settlePendingMedia],
  )

  /** 실패한 로컬 메시지 재전송 — 기존 항목 제거 후 같은 내용으로 새로 발송 */
  const retry = useCallback(
    (message: LocalMessage) => {
      if (!roomId || !message.clientMessageId) return
      const pending = pendingMediaRef.current.get(message.clientMessageId)
      removeLocalMessage(queryClient, roomId, message.clientMessageId)
      if (isMediaType(message.type)) {
        if (pending) {
          settlePendingMedia(message.clientMessageId)
          void sendMedia(pending.file)
        } else {
          toast.addToast('다시 보낼 수 없는 메시지입니다', { preset: 'error' })
        }
      } else {
        sendText(message.content ?? '', message.replyToId ?? undefined)
      }
    },
    [roomId, queryClient, sendMedia, sendText, settlePendingMedia, toast],
  )

  return { sendText, sendMedia, retry, discard }
}
