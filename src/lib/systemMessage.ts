/**
 * SYSTEM 메시지 페이로드 → 표시 텍스트.
 *
 * 백엔드(messages/system-message.ts)는 입장/퇴장/방 변경 같은 서버 생성 이벤트를
 * Message.content 에 JSON 으로 직렬화해 내려준다(type='SYSTEM'). 화면에서는 이 JSON 을
 * 사람이 읽는 한국어 안내문으로 변환한다. 이름 해석은 호출부의 resolveName 에 위임한다
 * (방 멤버맵 기반 — [[RoomPage]] 의 resolveName).
 */

/** 백엔드 SystemMessagePayload 미러 (스키마에 응답 타입이 없어 손으로 정의) */
export type SystemMessagePayload =
  | { code: 'ROOM_CREATED'; actorId: string }
  | { code: 'MEMBER_JOINED'; actorId: string; targetIds: string[] }
  | { code: 'MEMBER_LEFT'; actorId: string }
  | { code: 'MEMBER_KICKED'; actorId: string; targetId: string }
  | { code: 'ROOM_RENAMED'; actorId: string; name: string }
  | { code: 'ROOM_AVATAR_CHANGED'; actorId: string }
  | { code: 'ROLE_CHANGED'; actorId: string; targetId: string; role: string }

/** content(JSON 문자열) → 페이로드. 형식이 깨졌으면 null. */
export function parseSystemPayload(content: string): SystemMessagePayload | null {
  try {
    const parsed = JSON.parse(content) as unknown
    if (parsed && typeof parsed === 'object' && 'code' in parsed) {
      return parsed as SystemMessagePayload
    }
  } catch {
    // JSON 이 아니면 null 로 폴백
  }
  return null
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: '방장',
  ADMIN: '관리자',
  MEMBER: '멤버',
}

/** userId 목록 → "A, B" (닉네임 해석). 비어 있으면 '멤버'. */
function joinNames(ids: string[], resolveName: (userId: string) => string): string {
  return ids.length ? ids.map(resolveName).join(', ') : '멤버'
}

/**
 * 시스템 이벤트 안내문. resolveName 은 userId → 닉네임(미상이면 '알 수 없음').
 * 백엔드 systemPreview(이름 없는 요약)보다 행위자/대상 이름을 포함해 대화창에 맞게 표시한다.
 */
export function formatSystemMessage(
  payload: SystemMessagePayload,
  resolveName: (userId: string) => string,
): string {
  const actor = resolveName(payload.actorId)
  switch (payload.code) {
    case 'ROOM_CREATED':
      return `${actor}님이 채팅방을 만들었습니다.`
    case 'MEMBER_JOINED':
      return `${actor}님이 ${joinNames(payload.targetIds, resolveName)}님을 초대했습니다.`
    case 'MEMBER_LEFT':
      return `${actor}님이 나갔습니다.`
    case 'MEMBER_KICKED':
      return `${actor}님이 ${resolveName(payload.targetId)}님을 내보냈습니다.`
    case 'ROOM_RENAMED':
      return `${actor}님이 방 이름을 '${payload.name}'(으)로 변경했습니다.`
    case 'ROOM_AVATAR_CHANGED':
      return `${actor}님이 방 사진을 변경했습니다.`
    case 'ROLE_CHANGED':
      return `${actor}님이 ${resolveName(payload.targetId)}님을 ${ROLE_LABEL[payload.role] ?? payload.role}(으)로 변경했습니다.`
    default:
      return '시스템 메시지'
  }
}
