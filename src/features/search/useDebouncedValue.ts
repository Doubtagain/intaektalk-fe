import { useEffect, useState } from 'react'

/** 입력값을 delayMs 뒤에 반영하는 디바운스 훅 — 검색 질의에 사용 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
