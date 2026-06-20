import { create } from 'zustand'

/** WS `typing`/`presence` 이벤트로 채워지는 휘발성 상태 (서버 캐시와 분리) */
interface PresenceState {
  /** roomId → (userId → true). typing:stop 또는 타임아웃 시 제거 */
  typingByRoom: Record<string, Record<string, boolean>>
  /** userId → online */
  onlineByUser: Record<string, boolean>
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void
  setOnline: (userId: string, online: boolean) => void
  reset: () => void
}

export const usePresenceStore = create<PresenceState>()((set) => ({
  typingByRoom: {},
  onlineByUser: {},
  setTyping: (roomId, userId, isTyping) =>
    set((state) => {
      const room = { ...(state.typingByRoom[roomId] ?? {}) }
      if (isTyping) room[userId] = true
      else delete room[userId]
      return { typingByRoom: { ...state.typingByRoom, [roomId]: room } }
    }),
  setOnline: (userId, online) =>
    set((state) => ({ onlineByUser: { ...state.onlineByUser, [userId]: online } })),
  reset: () => set({ typingByRoom: {}, onlineByUser: {} }),
}))
