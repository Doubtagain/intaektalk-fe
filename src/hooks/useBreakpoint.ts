import { useSyncExternalStore } from 'react'

/** 앱 브레이크포인트 — Bezier 는 breakpoint 토큰을 발행하지 않으므로 앱 레이어에서 정의.
 * mobile < 768px <= tablet < 1024px <= desktop (global.css 주석과 동기화) */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const TABLET_QUERY = '(min-width: 768px)'
const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribe(callback: () => void) {
  const tablet = window.matchMedia(TABLET_QUERY)
  const desktop = window.matchMedia(DESKTOP_QUERY)
  tablet.addEventListener('change', callback)
  desktop.addEventListener('change', callback)
  return () => {
    tablet.removeEventListener('change', callback)
    desktop.removeEventListener('change', callback)
  }
}

function getSnapshot(): Breakpoint {
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop'
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet'
  return 'mobile'
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'desktop' as const)
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
