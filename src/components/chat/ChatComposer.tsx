import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

import {
  AlphaIconButton,
  Divider,
  TextArea,
  useKeyboardActionLockerWhileComposing,
  type TextAreaHeight,
} from '@channel.io/bezier-react'
import { ImageIcon, SendIcon } from '@channel.io/bezier-icons'

import { useSocket } from '@/lib/socket/SocketProvider'

interface ChatComposerProps {
  roomId: string
  onSendText: (content: string) => void
  onSendMedia: (file: File) => void
}

/** Bezier TextAreaHeight 타입은 1행을 노출하지 않지만 런타임(react-textarea-autosize)은 임의 행 수를 받는다 */
const MIN_ROWS = 1 as unknown as TextAreaHeight

const TYPING_IDLE_MS = 2000

/**
 * 하단 입력 바(§6.3) — TextArea 자동 높이(1~6줄), Enter 전송 / Shift+Enter 줄바꿈.
 * 한글 IME 조합 중 Enter 는 useKeyboardActionLockerWhileComposing 으로 잠근다.
 * 입력 시작 시 typing:start, 2초 입력 없음 또는 전송 시 typing:stop 발행.
 */
export function ChatComposer({ roomId, onSendText, onSendMedia }: ChatComposerProps) {
  const socket = useSocket()
  const [value, setValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (typingRef.current) {
      typingRef.current = false
      socket?.emit('typing:stop', { roomId })
    }
  }, [socket, roomId])

  // 방 변경/언마운트 시 typing 해제 + 입력 초기화
  useEffect(() => () => stopTyping(), [stopTyping])
  useEffect(() => {
    setValue('')
  }, [roomId])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    if (next.trim().length === 0) {
      stopTyping()
      return
    }
    if (!typingRef.current && socket) {
      typingRef.current = true
      socket.emit('typing:start', { roomId })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }

  const submit = useCallback(() => {
    const content = value.trim()
    if (!content) return
    onSendText(content)
    setValue('')
    stopTyping()
  }, [value, onSendText, stopTyping])

  const { handleKeyDown, handleKeyUp } = useKeyboardActionLockerWhileComposing<HTMLTextAreaElement>({
    keysToLock: ['Enter'],
    onKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    },
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSendMedia(file)
    e.target.value = ''
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <Divider withoutIndent />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 12px' }}>
        <AlphaIconButton
          content={ImageIcon}
          aria-label="사진 첨부"
          variant="tertiary"
          color="dark-grey"
          size="m"
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4"
          hidden
          onChange={handleFileChange}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <TextArea
            value={value}
            placeholder="메시지 입력"
            aria-label="메시지 입력"
            minRows={MIN_ROWS}
            maxRows={6}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
          />
        </div>
        <AlphaIconButton
          content={SendIcon}
          aria-label="전송"
          variant="primary"
          color="blue"
          size="m"
          disabled={value.trim().length === 0}
          onClick={submit}
        />
      </div>
    </div>
  )
}
