import { useEffect } from 'react'

import { useSocket } from '@/lib/socket/SocketProvider'
import { useUiStore } from '@/stores/uiStore'

/**
 * 대화방 진입/이탈 시 activeRoomId 를 동기화하고 소켓 룸에 조인한다.
 * - 마운트(또는 roomId 변경) 시 setActiveRoomId, 언마운트 시 null.
 * - 소켓이 연결되어 있으면 room:join 발행. 연결 전이면 SocketProvider 의
 *   connect 핸들러가 activeRoomId 기준으로 재조인한다.
 */
export function useRoomSocket(roomId: string | undefined) {
  const socket = useSocket()

  useEffect(() => {
    if (!roomId) return
    useUiStore.getState().setActiveRoomId(roomId)
    return () => {
      if (useUiStore.getState().activeRoomId === roomId) {
        useUiStore.getState().setActiveRoomId(null)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId || !socket) return
    if (socket.connected) socket.emit('room:join', { roomId })
  }, [socket, roomId])
}
