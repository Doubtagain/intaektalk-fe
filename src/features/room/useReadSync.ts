import { useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { roomsApi } from '@/lib/api/endpoints'
import { applyReadReceipt, clearRoomUnread } from '@/lib/socket/cache'
import { useSocket } from '@/lib/socket/SocketProvider'
import { useAuthStore } from '@/stores/authStore'

/**
 * 읽음 동기화 — 방이 열려 있고 문서가 visible 일 때 최신 seq 로:
 * REST markRead + WS message:read 발행 + 방 목록 미읽음 0 + 내 lastReadSeq 캐시 반영.
 * 같은 seq 중복 발송은 방지한다.
 */
export function useReadSync(roomId: string | undefined, latestSeq: number | undefined) {
  const queryClient = useQueryClient()
  const socket = useSocket()
  const lastSentRef = useRef<{ roomId: string; seq: number } | null>(null)

  useEffect(() => {
    if (!roomId || latestSeq == null || latestSeq <= 0) return

    const send = () => {
      if (document.visibilityState !== 'visible') return
      const last = lastSentRef.current
      if (last && last.roomId === roomId && last.seq >= latestSeq) return
      lastSentRef.current = { roomId, seq: latestSeq }
      void roomsApi.markRead(roomId, latestSeq).catch(() => {
        // 읽음 처리 실패는 치명적이지 않다 — 다음 동기화에서 복구된다
        lastSentRef.current = null
      })
      socket?.emit('message:read', { roomId, seq: latestSeq })
      clearRoomUnread(queryClient, roomId)
      const me = useAuthStore.getState().user
      if (me) applyReadReceipt(queryClient, roomId, me.id, latestSeq)
    }

    send()
    document.addEventListener('visibilitychange', send)
    return () => document.removeEventListener('visibilitychange', send)
  }, [roomId, latestSeq, socket, queryClient])
}
