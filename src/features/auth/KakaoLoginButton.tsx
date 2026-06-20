import { ChatBubbleFilledIcon } from '@channel.io/bezier-icons'
import { Icon, Spinner } from '@channel.io/bezier-react'

import './kakao-button.css'

interface KakaoLoginButtonProps {
  loading?: boolean
  onClick: () => void
}

/**
 * 카카오 로그인 버튼 — 카카오 브랜드 컬러는 kakao-button.css 의
 * --color-fill-kakao / --color-text-kakao 새 role 만 참조한다.
 * 심볼은 bezier-icons 의 ChatBubbleFilledIcon (currentColor 상속).
 */
export function KakaoLoginButton({ loading = false, onClick }: KakaoLoginButtonProps) {
  return (
    <button
      type="button"
      className="kakao-login-button"
      disabled={loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? <Spinner size="s" /> : <Icon source={ChatBubbleFilledIcon} size="s" />}
      카카오 로그인
    </button>
  )
}
