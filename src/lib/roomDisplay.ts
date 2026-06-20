import type { MessagePreview, Room, User } from '@/lib/api/types'

/** DIRECT 방의 상대 멤버 (목록 응답에 members 가 없으면 null) */
export function getDirectPeer(room: Room, myUserId: string | undefined): User | null {
  if (room.type !== 'DIRECT' || !room.members) return null
  const peer = room.members.find((m) => m.userId !== myUserId)
  return peer?.user ?? null
}

/** 방 표시 이름: GROUP = name, DIRECT = 상대 닉네임 */
export function getRoomDisplayName(room: Room, myUserId: string | undefined): string {
  if (room.type === 'GROUP') return room.name ?? '그룹 채팅'
  return getDirectPeer(room, myUserId)?.nickname ?? '대화 상대'
}

/** 마지막 메시지 미리보기 텍스트. 미디어 타입은 라벨로 표시 */
export function getPreviewText(preview: MessagePreview | null): string {
  if (!preview) return ''
  switch (preview.type) {
    case 'GIF':
      return '움짤'
    case 'IMAGE':
      return preview.media?.isAnimated ? '움짤' : '사진'
    case 'VIDEO':
      return '동영상'
    case 'FILE':
      return '파일'
    default:
      return preview.content ?? ''
  }
}
