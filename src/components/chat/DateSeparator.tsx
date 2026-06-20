import { Text } from '@channel.io/bezier-react'

/** 날짜 경계 구분선 — 중앙 작은 알약 ("오늘"/"어제"/"2026년 6월 10일 수요일") */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: '16px 16px 8px' }}>
      <span
        style={{
          display: 'inline-flex',
          padding: '4px 10px',
          borderRadius: 'var(--radius-12)',
          backgroundColor: 'var(--bg-black-lightest)',
        }}
      >
        <Text typo="12" color="txt-black-dark">
          {label}
        </Text>
      </span>
    </div>
  )
}
