import { useSyncExternalStore } from 'react'

import type { ThemeName } from '@channel.io/bezier-react'

import { useUiStore } from '@/stores/uiStore'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getSystemTheme(): ThemeName {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/** uiStore 의 light/dark/system 설정을 실제 Bezier ThemeName 으로 해석 */
export function useResolvedTheme(): ThemeName {
  const preference = useUiStore((s) => s.theme)
  const systemTheme = useSyncExternalStore(subscribe, getSystemTheme, () => 'light' as const)
  return preference === 'system' ? systemTheme : preference
}
