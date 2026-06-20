import { ChatBubbleAltFilledIcon, ErrorTriangleFilledIcon } from '@channel.io/bezier-icons'
import { Banner, Icon, SmoothCornersBox, Text, VStack } from '@channel.io/bezier-react'

import { AuthCard } from '@/features/auth/AuthCard'
import { KakaoLoginButton } from '@/features/auth/KakaoLoginButton'
import { useKakaoLogin } from '@/features/auth/useKakaoLogin'

/** 로그인 (/login) — 카카오 로그인, instrument.md §5.1 */
export function LoginPage() {
  const { login, loading, errorKind } = useKakaoLogin()

  return (
    <AuthCard>
      <VStack align="center" spacing={16}>
        <SmoothCornersBox
          borderRadius={16}
          backgroundColor="bgtxt-blue-normal"
          style={{
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon source={ChatBubbleAltFilledIcon} size="xl" color="bgtxt-absolute-white-normal" />
        </SmoothCornersBox>

        <VStack align="center" spacing={6}>
          <Text typo="24" bold color="txt-black-darkest">
            인택톡
          </Text>
          <Text typo="14" color="txt-black-darker">
            카카오 계정으로 로그인해 대화를 시작합니다.
          </Text>
        </VStack>

        {errorKind === 'not-allowed' && (
          <Banner
            variant="red"
            icon={ErrorTriangleFilledIcon}
            content="등록된 사용자만 이용할 수 있어요"
          />
        )}
        {errorKind === 'sdk' && (
          <Banner
            variant="orange"
            icon={ErrorTriangleFilledIcon}
            content="카카오 로그인 설정을 불러오지 못했습니다. VITE_KAKAO_JS_KEY 환경 변수를 확인해 주세요."
          />
        )}

        <div style={{ width: '100%' }}>
          <KakaoLoginButton loading={loading} onClick={() => void login()} />
        </div>
      </VStack>
    </AuthCard>
  )
}
