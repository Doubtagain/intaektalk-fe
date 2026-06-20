import { Text } from '@channel.io/bezier-react'

import type { Room } from '@/lib/api/types'
import { usePresenceStore } from '@/stores/presenceStore'

interface TypingIndicatorProps {
  room: Room | undefined
  myUserId: string | undefined
}

/** 컴포저 위 얇은 줄 — "OO 입력 중..." */
export function TypingIndicator({ room, myUserId }: TypingIndicatorProps) {
  const typingMap = usePresenceStore((s) => (room ? s.typingByRoom[room.id] : undefined))

  if (!room || !typingMap) return null

  const names = Object.keys(typingMap)
    .filter((userId) => userId !== myUserId)
    .map(
      (userId) =>
        room.members?.find((member) => member.userId === userId)?.user.nickname ?? '상대방',
    )

  if (names.length === 0) return null

  return (
    <div style={{ flexShrink: 0, padding: '4px 16px 8px' }}>
      <Text typo="12" color="txt-black-dark">
        {names.join(', ')} 입력 중...
      </Text>
    </div>
  )
}
