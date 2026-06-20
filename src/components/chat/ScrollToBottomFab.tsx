import { AlphaFloatingIconButton } from '@channel.io/bezier-react'
import { ChevronDownIcon } from '@channel.io/bezier-icons'

interface ScrollToBottomFabProps {
  show: boolean
  /** 위로 올라가 있는 동안 새 메시지가 도착했는지 — 작은 미읽음 점 표시 */
  hasNewMessage: boolean
  onClick: () => void
}

/** 시각적 하단에서 멀어졌을 때 우하단(컴포저 위)에 뜨는 "맨 아래로" FAB */
export function ScrollToBottomFab({ show, hasNewMessage, onClick }: ScrollToBottomFabProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(4px)',
        pointerEvents: show ? 'auto' : 'none',
        transition:
          'opacity var(--transition-duration-s) var(--transition-timing-function-default), transform var(--transition-duration-s) var(--transition-timing-function-default)',
      }}
    >
      <AlphaFloatingIconButton
        content={ChevronDownIcon}
        aria-label="맨 아래로"
        size="m"
        variant="secondary"
        color="light-grey"
        onClick={onClick}
      />
      {hasNewMessage && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-42-p)',
            backgroundColor: 'var(--bgtxt-blue-normal)',
          }}
        />
      )}
    </div>
  )
}
