import { Divider, Text } from '@channel.io/bezier-react'

/** 방 진입 시점 기준 "여기까지 읽었습니다" 구분선 */
export function UnreadDivider() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '8px 16px' }}
    >
      <Divider withoutIndent style={{ flex: 1 }} />
      <Text typo="12" color="txt-black-dark">
        여기까지 읽었습니다
      </Text>
      <Divider withoutIndent style={{ flex: 1 }} />
    </div>
  )
}
