import { useEffect, useState } from 'react'

/** IntersectionObserver 기반 뷰포트 가시성 — 미디어 자동 재생/정지 판정에 사용 */
export function useInView<T extends Element>(): {
  ref: (node: T | null) => void
  inView: boolean
} {
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setInView(entry.isIntersecting))
      },
      { threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return { ref: setNode, inView }
}
