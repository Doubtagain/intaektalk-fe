import type { ReactNode } from 'react'

import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

/** 미로그인 → /login */
export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

/** 로그인 + 미온보딩 → /onboarding 강제 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user && !user.isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

/** 관리자 전용 (RequireAuth/RequireOnboarded 내부에서 사용 — user 는 이미 존재). 비관리자는 메인으로 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

/** 비로그인 전용 (이미 로그인 시 메인으로) */
export function PublicOnly({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (accessToken) {
    return <Navigate to={user && !user.isOnboarded ? '/onboarding' : '/'} replace />
  }
  return children
}

/** 온보딩 페이지 전용: 로그인 필요, 이미 온보딩이면 메인으로 */
export function OnboardingOnly({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (!accessToken) return <Navigate to="/login" replace />
  if (user?.isOnboarded) return <Navigate to="/" replace />
  return children
}
