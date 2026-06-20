import { useState } from 'react'

import { ArrowLeftIcon } from '@channel.io/bezier-icons'
import { AlphaIconButton, Box, Button, HStack, Text, VStack } from '@channel.io/bezier-react'
import { useNavigate } from 'react-router-dom'

import { AccessRequestsPane } from '@/features/admin/AccessRequestsPane'
import { WhitelistPane } from '@/features/admin/WhitelistPane'
import { useIsMobile } from '@/hooks/useBreakpoint'

type AdminTab = 'requests' | 'whitelist'

/** 관리자 콘솔 (/admin) — 가입 대기 승인 + 화이트리스트 관리. RequireAdmin 가드로 보호된다. */
export function AdminPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<AdminTab>('requests')

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
            관리자
          </Text>
        </HStack>
      )}
      <Box grow={1} overflowY="auto">
        <VStack
          align="stretch"
          spacing={16}
          width="100%"
          maxWidth={640}
          marginHorizontal="auto"
          padding={16}
        >
          {!isMobile && (
            <Text typo="22" bold color="txt-black-darkest">
              관리자
            </Text>
          )}

          <HStack spacing={4} align="center">
            <Button
              size="m"
              text="가입 대기"
              styleVariant={tab === 'requests' ? 'primary' : 'tertiary'}
              colorVariant={tab === 'requests' ? 'blue' : 'monochrome-dark'}
              onClick={() => setTab('requests')}
            />
            <Button
              size="m"
              text="화이트리스트"
              styleVariant={tab === 'whitelist' ? 'primary' : 'tertiary'}
              colorVariant={tab === 'whitelist' ? 'blue' : 'monochrome-dark'}
              onClick={() => setTab('whitelist')}
            />
          </HStack>

          {tab === 'requests' ? <AccessRequestsPane /> : <WhitelistPane />}
        </VStack>
      </Box>
    </VStack>
  )
}
