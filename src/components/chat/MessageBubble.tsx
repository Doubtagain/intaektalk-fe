import { AlphaIconButton, Avatar, SmoothCornersBox, Text } from '@channel.io/bezier-react'
import { RefreshIcon, TrashIcon } from '@channel.io/bezier-icons'

import { isMediaType, type LocalMessage } from '@/lib/api/types'
import { formatTime } from '@/lib/format'
import { getPreviewText } from '@/lib/roomDisplay'

import { MediaMessage } from './MediaMessage'

import './chat.css'

interface MessageBubbleProps {
  message: LocalMessage
  isMine: boolean
  isGroup: boolean
  /** 연속 발신자 묶음의 첫 메시지에만 아바타+닉네임 (GROUP 의 상대 메시지) */
  showSender: boolean
  firstOfGroup: boolean
  showTime: boolean
  /** 발신자 제외, lastReadSeq < seq 인 멤버 수. 0 이면 숨김 */
  unreadCount: number
  senderName: string
  senderAvatarUrl: string | null
  replySenderName: string | null
  mobile: boolean
  onRetry: (message: LocalMessage) => void
  onDiscard: (message: LocalMessage) => void
  /** 내 확정 메시지의 삭제 요청 (WS message:delete). 없으면 삭제 버튼 미노출 */
  onRequestDelete?: (message: LocalMessage) => void
}

/** 메시지 말풍선(§6.1) — squircle + 내/상대 색 분기 + 메타(안 읽은 N / 시간) */
export function MessageBubble({
  message,
  isMine,
  isGroup,
  showSender,
  firstOfGroup,
  showTime,
  unreadCount,
  senderName,
  senderAvatarUrl,
  replySenderName,
  mobile,
  onRetry,
  onDiscard,
  onRequestDelete,
}: MessageBubbleProps) {
  const sending = message.localStatus === 'sending'
  const failed = message.localStatus === 'failed'
  const deleted = message.deletedAt != null
  const maxWidth = mobile ? '78%' : '70%'
  const mainColor = isMine ? 'bgtxt-absolute-white-normal' : 'txt-black-darkest'
  const subColor = isMine ? 'bgtxt-absolute-white-light' : 'txt-black-dark'
  const dimmed = sending ? 'var(--opacity-disabled)' : undefined

  const isMedia =
    isMediaType(message.type) && (message.media != null || message.mediaId != null) && !deleted

  const bubble = isMedia ? (
    <div style={{ maxWidth, minWidth: 0, opacity: dimmed }}>
      <MediaMessage media={message.media ?? undefined} mediaId={message.mediaId ?? undefined} />
    </div>
  ) : (
    <SmoothCornersBox
      borderRadius={16}
      backgroundColor={isMine ? 'bgtxt-blue-normal' : 'bg-grey-lighter'}
      style={{ maxWidth, minWidth: 0, padding: '8px 12px', opacity: dimmed }}
    >
      {message.replyTo && !deleted && (
        <SmoothCornersBox
          borderRadius={8}
          backgroundColor="bg-black-lightest"
          style={{ padding: '6px 8px', marginBottom: 6 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Text typo="12" bold color={mainColor} truncated>
              {replySenderName ?? '알 수 없음'}
            </Text>
            <Text typo="12" color={subColor} truncated>
              {getPreviewText(message.replyTo)}
            </Text>
          </div>
        </SmoothCornersBox>
      )}
      {deleted ? (
        <Text typo="15" italic color={subColor}>
          삭제된 메시지입니다
        </Text>
      ) : (
        <Text
          typo="15"
          color={mainColor}
          style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {message.content}
        </Text>
      )}
    </SmoothCornersBox>
  )

  // 말풍선 옆 메타 — 내 메시지는 좌측, 상대 메시지는 우측 (row-reverse 로 처리)
  const meta = sending ? null : failed ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <AlphaIconButton
        content={RefreshIcon}
        aria-label="재전송"
        variant="secondary"
        color="red"
        size="xs"
        onClick={() => onRetry(message)}
      />
      <AlphaIconButton
        content={TrashIcon}
        aria-label="삭제"
        variant="secondary"
        color="red"
        size="xs"
        onClick={() => onDiscard(message)}
      />
    </div>
  ) : unreadCount > 0 || showTime ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}
    >
      {unreadCount > 0 && (
        <Text typo="11" bold color="bgtxt-blue-normal">
          {unreadCount}
        </Text>
      )}
      {showTime && (
        <Text typo="11" color="txt-black-dark">
          {formatTime(message.createdAt)}
        </Text>
      )}
    </div>
  ) : null

  // 내 확정 메시지에만 호버 시 삭제 액션 노출
  const canDelete = isMine && !deleted && !message.localStatus && !!onRequestDelete

  return (
    <div
      className="chat-message-row"
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
        flexShrink: 0,
        marginTop: firstOfGroup ? 8 : 4,
        padding: '0 16px',
      }}
    >
      {!isMine &&
        isGroup &&
        (showSender ? (
          <Avatar
            name={senderName}
            avatarUrl={senderAvatarUrl ?? undefined}
            size="30"
            style={{ flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 30, flexShrink: 0 }} aria-hidden />
        ))}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          flex: 1,
          minWidth: 0,
          gap: 4,
        }}
      >
        {showSender && (
          <Text typo="12" color="txt-black-darker">
            {senderName}
          </Text>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: isMine ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 4,
            width: '100%',
          }}
        >
          {bubble}
          {meta}
          {canDelete && (
            <span className="chat-message-action" style={{ flexShrink: 0 }}>
              <AlphaIconButton
                content={TrashIcon}
                aria-label="메시지 삭제"
                variant="tertiary"
                color="dark-grey"
                size="xs"
                onClick={() => onRequestDelete?.(message)}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
