import type { LocalMessage, Message, RoomMember } from '@/lib/api/types'
import { formatDateLabel, isSameDay } from '@/lib/format'

/** 방 진입 시점에 1회 캡처하는 미읽음 구분선 기준 */
export interface UnreadAnchor {
  roomId: string
  /** 진입 시점의 내 lastReadSeq */
  lastReadSeq: number
  /** 진입 시각(ms) — 진입 후 송수신된 메시지에는 구분선을 두지 않는다 */
  entryAt: number
}

/** 역순(items[0]=최신) 배열에서 각 메시지의 렌더 플래그 */
export interface MessageRenderFlags {
  /** 날짜 경계면 라벨, 아니면 null */
  dateSeparatorLabel: string | null
  /** 연속 발신자 묶음의 첫 메시지(시간순) 여부 — 아바타/닉네임 표시 기준 */
  firstOfGroup: boolean
  /** 같은 분·같은 발신자 묶음의 마지막(시간순) 여부 — 시간 표시 기준 */
  showTime: boolean
  /** 이 메시지 위에 "여기까지 읽었습니다" 구분선 표시 여부 */
  unreadDividerAbove: boolean
}

function sameMinute(aIso: string, bIso: string): boolean {
  const a = new Date(aIso)
  const b = new Date(bIso)
  return isSameDay(a, b) && a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes()
}

/**
 * items 는 seq 내림차순(최신 우선)이다.
 * 시간순 이전 메시지 = items[index + 1], 시간순 다음 메시지 = items[index - 1].
 */
export function computeRenderFlags(
  items: LocalMessage[],
  index: number,
  opts: { hasMoreOlder: boolean; anchor: UnreadAnchor | null },
): MessageRenderFlags {
  const message = items[index]
  const older = items[index + 1]
  const newer = index > 0 ? items[index - 1] : undefined
  const messageDate = new Date(message.createdAt)

  // 더 과거 페이지가 남아 있으면 이력 맨 위에는 날짜 구분선을 보류한다
  const dateChanged = older
    ? !isSameDay(new Date(older.createdAt), messageDate)
    : !opts.hasMoreOlder
  const dateSeparatorLabel = dateChanged ? formatDateLabel(message.createdAt) : null

  const firstOfGroup =
    message.type !== 'SYSTEM' &&
    (!older ||
      older.type === 'SYSTEM' ||
      older.senderId !== message.senderId ||
      !isSameDay(new Date(older.createdAt), messageDate))

  const showTime =
    message.type !== 'SYSTEM' &&
    (!newer ||
      newer.type === 'SYSTEM' ||
      newer.senderId !== message.senderId ||
      !sameMinute(newer.createdAt, message.createdAt))

  const anchor = opts.anchor
  const unreadDividerAbove =
    !!anchor &&
    message.seq > anchor.lastReadSeq &&
    messageDate.getTime() <= anchor.entryAt &&
    (!older || older.seq <= anchor.lastReadSeq)

  return { dateSeparatorLabel, firstOfGroup, showTime, unreadDividerAbove }
}

/**
 * 메시지별 "안 읽은 N" — 발신자 제외 멤버 수에서 백엔드 readCount(읽은 수)를 뺀다.
 * 백엔드가 멤버별 lastReadSeq 를 주지 않으므로 message.readCount 를 단일 출처로 쓴다.
 * readCount 가 없는(낙관적/WS 직후) 메시지는 0 으로 둔다.
 */
export function countUnreadMembers(members: RoomMember[], message: Message): number {
  if (message.readCount == null) return 0
  return Math.max(0, members.length - 1 - message.readCount)
}
