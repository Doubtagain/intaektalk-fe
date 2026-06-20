import { useEffect } from 'react'

import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { useAuthStore } from '@/stores/authStore'

/**
 * 앱 시작 시 토큰이 있으면 GET /auth/me 로 사용자/온보딩 상태를 서버 기준으로 동기화한다.
 * 401(리프레시까지 실패)이면 세션을 정리해 가드가 /login 으로 보낸다.
 */
export function useSessionBootstrap() {
  useEffect(() => {
    const { accessToken, setUser, clear } = useAuthStore.getState()
    if (!accessToken) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        const prev = useAuthStore.getState().user
        // /auth/me 응답이 온보딩 플래그를 누락할 수 있으므로, 이미 온보딩된 세션은 다운그레이드하지 않는다.
        // (명시적 값은 존중하고, 누락(undefined)일 때만 기존 값으로 폴백)
        setUser({ ...me, isOnboarded: me.isOnboarded ?? prev?.isOnboarded ?? false })
      })
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) clear()
      })
    return () => {
      cancelled = true
    }
  }, [])
}
