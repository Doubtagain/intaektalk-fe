import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

/** 미디어(움짤) 자동 재생 정책. 기본값: Wi-Fi에서만 자동재생 (README 참조) */
export type AutoplayPolicy = 'always' | 'wifi-only' | 'never'

interface UiState {
  theme: ThemePreference
  autoplay: AutoplayPolicy
  notificationsEnabled: boolean
  /** 현재 열려 있는 방 id (없으면 null) */
  activeRoomId: string | null
  socketConnected: boolean
  setTheme: (theme: ThemePreference) => void
  setAutoplay: (policy: AutoplayPolicy) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setActiveRoomId: (roomId: string | null) => void
  setSocketConnected: (connected: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      autoplay: 'wifi-only',
      notificationsEnabled: true,
      activeRoomId: null,
      socketConnected: false,
      setTheme: (theme) => set({ theme }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
      setSocketConnected: (socketConnected) => set({ socketConnected }),
    }),
    {
      name: 'intaektalk-ui',
      partialize: (state) => ({
        theme: state.theme,
        autoplay: state.autoplay,
        notificationsEnabled: state.notificationsEnabled,
      }),
    },
  ),
)
