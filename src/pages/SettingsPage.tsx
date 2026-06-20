import { ArrowLeftIcon } from '@channel.io/bezier-icons'
import {
  AlphaIconButton,
  Box,
  Divider,
  HStack,
  SectionLabel,
  Text,
  VStack,
} from '@channel.io/bezier-react'
import { useNavigate } from 'react-router-dom'

import { AppearanceSection } from '@/features/settings/AppearanceSection'
import { LogoutSection } from '@/features/settings/LogoutSection'
import { MediaSection } from '@/features/settings/MediaSection'
import { NotificationSection } from '@/features/settings/NotificationSection'
import { ProfileSection } from '@/features/settings/ProfileSection'
import { useIsMobile } from '@/hooks/useBreakpoint'

/** 설정 (/settings) — 프로필/화면/알림/미디어/로그아웃 (instrument.md §5.7) */
export function SettingsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  return (
    <VStack align="stretch" style={{ height: '100%' }}>
      {isMobile && (
        <HStack align="center" spacing={8} padding={8}>
          <AlphaIconButton
            content={ArrowLeftIcon}
            variant="tertiary"
            color="dark-grey"
            size="m"
            aria-label="뒤로 가기"
            onClick={() => navigate(-1)}
          />
          <Text typo="16" bold color="txt-black-darkest">
            설정
          </Text>
        </HStack>
      )}
      <Box grow={1} overflowY="auto">
        <VStack
          align="stretch"
          spacing={8}
          width="100%"
          maxWidth={560}
          marginHorizontal="auto"
          padding={16}
        >
          {!isMobile && (
            <Text typo="22" bold color="txt-black-darkest" marginBottom={8}>
              설정
            </Text>
          )}

          <SectionLabel content="프로필" />
          <ProfileSection />
          <Divider />

          <SectionLabel content="화면" />
          <AppearanceSection />
          <Divider />

          <SectionLabel content="알림" />
          <NotificationSection />
          <Divider />

          <SectionLabel content="미디어" />
          <MediaSection />
          <Divider />

          <LogoutSection />
        </VStack>
      </Box>
    </VStack>
  )
}
