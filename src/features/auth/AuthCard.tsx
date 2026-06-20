import type { ReactNode } from 'react'

import { Center, SmoothCornersBox } from '@channel.io/bezier-react'

interface AuthCardProps {
  /** 카드 최대 폭 (px) */
  width?: number
  children: ReactNode
}

/** 로그인 / 온보딩 공용 — 화면 중앙 정렬 squircle 카드 표면 */
export function AuthCard({ width = 360, children }: AuthCardProps) {
  return (
    <Center style={{ height: '100%', padding: 24 }}>
      <SmoothCornersBox
        borderRadius={20}
        backgroundColor="bg-grey-lightest"
        style={{ width: '100%', maxWidth: width, padding: 32 }}
      >
        {children}
      </SmoothCornersBox>
    </Center>
  )
}
