import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthTokens, User } from '@/lib/api/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (tokens: AuthTokens, user: User) => void
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: User) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (tokens, user) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'intaektalk-auth' },
  ),
)

/** React 외부(api client, socket)에서 토큰을 읽을 때 사용 */
export const getAuthState = () => useAuthStore.getState()
