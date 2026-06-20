import { Text } from '@channel.io/bezier-react'

import { formatSystemMessage, parseSystemPayload } from '@/lib/systemMessage'

interface SystemMessageProps {
  /** Message.content (시스템 이벤트 JSON 문자열) */
  content: string
  /** userId → 닉네임 (미상이면 '알 수 없음') */
  resolveName: (userId: string) => string
}

/** 시스템 메시지(입장/퇴장/방 변경) — JSON 페이로드를 한국어 안내문으로 변환해 중앙 정렬 표시 */
export function SystemMessage({ content, resolveName }: SystemMessageProps) {
  const payload = parseSystemPayload(content)
  const text = payload ? formatSystemMessage(payload, resolveName) : '시스템 메시지'
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: '8px 16px' }}>
      <Text typo="12" color="txt-black-dark" align="center">
        {text}
      </Text>
    </div>
  )
}
