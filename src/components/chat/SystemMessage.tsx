import { Text } from '@channel.io/bezier-react'

/** 시스템 메시지(입장/퇴장/방 변경) — 중앙 정렬 보조 텍스트 */
export function SystemMessage({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: '8px 16px' }}>
      <Text typo="12" color="txt-black-dark" align="center">
        {content}
      </Text>
    </div>
  )
}
