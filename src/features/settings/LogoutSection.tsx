import { useState } from 'react'

import {
  Button,
  ConfirmModal,
  ConfirmModalClose,
  ConfirmModalContent,
  ConfirmModalFooter,
  ConfirmModalHeader,
} from '@channel.io/bezier-react'

import { authApi } from '@/lib/api/endpoints'
import { useAuthStore } from '@/stores/authStore'

/** 설정 §로그아웃 — ConfirmModal 확인 후 세션 정리 (가드가 /login 으로 보낸다) */
export function LogoutSection() {
  const clear = useAuthStore((s) => s.clear)
  const [show, setShow] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      // 백엔드는 리프레시 토큰 무효화를 위해 refreshToken 을 받는다
      const { refreshToken } = useAuthStore.getState()
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // 서버 로그아웃 실패는 무시하고 로컬 세션을 정리한다
    }
    clear()
  }

  return (
    <>
      <Button
        styleVariant="secondary"
        colorVariant="red"
        size="l"
        text="로그아웃"
        style={{ width: '100%' }}
        onClick={() => setShow(true)}
      />
      <ConfirmModal show={show} onHide={() => setShow(false)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title="로그아웃할까요?"
            description="다시 이용하려면 카카오 계정으로 로그인해야 합니다."
          />
          <ConfirmModalFooter
            rightContent={
              <>
                <ConfirmModalClose>
                  <Button styleVariant="tertiary" colorVariant="monochrome-dark" text="취소" />
                </ConfirmModalClose>
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="로그아웃"
                  loading={loggingOut}
                  onClick={() => void handleLogout()}
                />
              </>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>
    </>
  )
}
