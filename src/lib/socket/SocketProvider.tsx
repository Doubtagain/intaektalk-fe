import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'

import { refreshTokens } from '@/lib/api/client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'
import {
  applyNewMessageToRoomList,
  applyReadReceipt,
  markMessageDeleted,
  upsertMessage,
  upsertRoom,
} from '@/lib/socket/cache'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useUiStore } from '@/stores/uiStore'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'

const SocketContext = createContext<AppSocket | null>(null)

/**
 * 인증된 동안 Socket.IO `/ws` 네임스페이스에 연결을 유지하고,
 * 서버 이벤트를 TanStack Query 캐시/휘발성 스토어에 반영한다.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [socket, setSocket] = useState<AppSocket | null>(null)
  /** typing 자동 만료 타이머: `${roomId}:${userId}` → timer */
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (!accessToken) {
      setSocket(null)
      return
    }

    const s: AppSocket = io(`${WS_URL}/ws`, {
      // 재연결 시점의 최신 토큰을 쓰도록 콜백 형태 사용
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
      transports: ['websocket'],
    })

    const ui = useUiStore.getState()
    const presence = usePresenceStore.getState()

    s.on('connect', () => {
      useUiStore.getState().setSocketConnected(true)
      // 재연결 시: 방 목록·활성 방 이력 재동기화 + 활성 방 재조인
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms })
      const activeRoomId = useUiStore.getState().activeRoomId
      if (activeRoomId) {
        s.emit('room:join', { roomId: activeRoomId })
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(activeRoomId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.room(activeRoomId) })
      }
    })

    s.on('disconnect', () => {
      useUiStore.getState().setSocketConnected(false)
    })

    s.on('connect_error', async (err) => {
      // 토큰 만료로 거절된 경우 refresh 후 재시도
      if (/auth|token|unauthorized|jwt/i.test(err.message)) {
        const refreshed = await refreshTokens()
        if (refreshed) s.connect()
      }
    })

    s.on('message:new', (message) => {
      const me = useAuthStore.getState().user
      const activeRoomId = useUiStore.getState().activeRoomId
      upsertMessage(queryClient, message)
      applyNewMessageToRoomList(queryClient, message, {
        isActiveRoom: activeRoomId === message.roomId,
        isMine: me?.id === message.senderId,
      })
      // 발신자의 typing 표시 해제
      presence.setTyping(message.roomId, message.senderId, false)
    })

    s.on('message:read', ({ roomId, userId, lastReadSeq }) => {
      applyReadReceipt(queryClient, roomId, userId, lastReadSeq)
    })

    s.on('message:deleted', ({ roomId, messageId }) => {
      markMessageDeleted(queryClient, roomId, messageId)
    })

    s.on('typing', ({ roomId, userId, isTyping }) => {
      presence.setTyping(roomId, userId, isTyping)
      const key = `${roomId}:${userId}`
      const prev = typingTimers.current.get(key)
      if (prev) clearTimeout(prev)
      if (isTyping) {
        // typing:stop 유실 대비 5초 자동 만료
        typingTimers.current.set(
          key,
          setTimeout(() => presence.setTyping(roomId, userId, false), 5000),
        )
      }
    })

    s.on('presence', ({ userId, online }) => {
      presence.setOnline(userId, online)
    })

    s.on('room:created', (room) => upsertRoom(queryClient, room))
    s.on('room:updated', (room) => upsertRoom(queryClient, room))

    setSocket(s)

    const timers = typingTimers.current
    return () => {
      s.disconnect()
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      ui.setSocketConnected(false)
      setSocket(null)
    }
  }, [accessToken, queryClient])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

/** 연결 전이면 null. 발행이 필요한 화면은 null 가드 후 사용 */
export function useSocket(): AppSocket | null {
  return useContext(SocketContext)
}
