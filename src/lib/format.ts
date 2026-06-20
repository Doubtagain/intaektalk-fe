/** 한국어 날짜/시간 표시 유틸 — 채팅 목록·말풍선·날짜 구분선이 공유 */

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

const shortDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
})

/** "오후 3:24" */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** 채팅 목록 우측 시간: 오늘 → 시각, 어제 → "어제", 그 외 → "5월 12일" */
export function formatRoomListTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (isSameDay(date, now)) return formatTime(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return '어제'
  return shortDateFormatter.format(date)
}

/** 날짜 구분선: 오늘/어제/그 외 "2026년 6월 10일 수요일" */
export function formatDateLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (isSameDay(date, now)) return '오늘'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return '어제'
  return dateFormatter.format(date)
}
