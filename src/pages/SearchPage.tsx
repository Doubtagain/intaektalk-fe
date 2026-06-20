import { useState, type ReactNode } from 'react'

import { ArrowLeftIcon } from '@channel.io/bezier-icons'
import {
  AlphaIconButton,
  Box,
  Button,
  HStack,
  Spinner,
  Text,
  TextField,
  VStack,
  useToast,
} from '@channel.io/bezier-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { UserSearchResults } from '@/features/search/UserSearchResults'
import { useDebouncedValue } from '@/features/search/useDebouncedValue'
import { useUserSearch } from '@/hooks/queries'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { roomsApi } from '@/lib/api/endpoints'
import type { User } from '@/lib/api/types'
import { upsertRoom } from '@/lib/socket/cache'
import { useAuthStore } from '@/stores/authStore'

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <VStack align="center" spacing={8} paddingVertical={32}>
      {children}
    </VStack>
  )
}

/** 사용자 검색 (/search) — 닉네임 검색 → 1:1 방 생성/이동 (instrument.md §5.6) */
export function SearchPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const toast = useToast()
  const me = useAuthStore((s) => s.user)

  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 300)
  const query = debouncedKeyword.trim()
  const search = useUserSearch(query)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  /** 자기 자신은 결과에서 제외 */
  const results = (search.data ?? []).filter((user) => user.id !== me?.id)

  const handleSelect = async (user: User) => {
    if (busyUserId) return
    setBusyUserId(user.id)
    try {
      // 서버가 기존 1:1 방이 있으면 재사용해 돌려준다
      const room = await roomsApi.create({ type: 'DIRECT', memberUserIds: [user.id] })
      upsertRoom(queryClient, room)
      navigate(`/rooms/${room.id}`)
    } catch {
      toast.addToast('대화방을 열지 못했어요', { preset: 'error' })
    } finally {
      setBusyUserId(null)
    }
  }

  /** 디바운스 반영 대기 중 여부 (입력 직후 잠깐) */
  const waiting = keyword.trim().length > 0 && keyword.trim() !== query

  let body: ReactNode
  if (keyword.trim().length === 0) {
    body = (
      <CenteredState>
        <Text typo="14" color="txt-black-dark" align="center">
          등록된 사용자를 닉네임으로 찾을 수 있어요
        </Text>
      </CenteredState>
    )
  } else if (waiting || search.isLoading) {
    body = (
      <CenteredState>
        <Spinner size="m" />
      </CenteredState>
    )
  } else if (search.isError) {
    body = (
      <CenteredState>
        <Text typo="14" color="txt-black-dark" align="center">
          검색 중 문제가 발생했어요
        </Text>
        <Button
          styleVariant="secondary"
          colorVariant="blue"
          size="m"
          text="다시 시도"
          onClick={() => void search.refetch()}
        />
      </CenteredState>
    )
  } else if (results.length === 0) {
    body = (
      <CenteredState>
        <Text typo="14" color="txt-black-dark" align="center">
          검색 결과가 없어요
        </Text>
      </CenteredState>
    )
  } else {
    body = <UserSearchResults users={results} busyUserId={busyUserId} onSelect={(user) => void handleSelect(user)} />
  }

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
            사용자 검색
          </Text>
        </HStack>
      )}
      <Box grow={1} overflowY="auto">
        <VStack
          align="stretch"
          spacing={16}
          width="100%"
          maxWidth={560}
          marginHorizontal="auto"
          padding={16}
        >
          {!isMobile && (
            <Text typo="22" bold color="txt-black-darkest">
              사용자 검색
            </Text>
          )}
          <TextField
            type="search"
            size="m"
            allowClear
            autoFocus
            placeholder="닉네임 검색"
            aria-label="닉네임 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {body}
        </VStack>
      </Box>
    </VStack>
  )
}
