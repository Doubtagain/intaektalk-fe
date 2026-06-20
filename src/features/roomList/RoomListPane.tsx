import { useState, type ReactNode } from 'react'

import { ChatBubbleAltIcon, PlusIcon, SearchIcon, SettingsIcon } from '@channel.io/bezier-icons'
import {
  AlphaFloatingIconButton,
  AlphaIconButton,
  Box,
  Button,
  Center,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from '@channel.io/bezier-react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import { CreateRoomModal } from '@/features/rooms/CreateRoomModal'
import { useRooms } from '@/hooks/queries'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { useUiStore } from '@/stores/uiStore'

import { RoomListItem } from './RoomListItem'

/** 우하단 FAB 와 마지막 행이 겹치지 않도록 두는 스크롤 여백 (레이아웃 치수, px) */
const FAB_CLEARANCE = 80

/** 채팅 목록 패널 — 데스크톱 분할 뷰의 가운데 컬럼 / 모바일 index 풀스크린 */
export function RoomListPane() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const socketConnected = useUiStore((s) => s.socketConnected)
  const [showCreate, setShowCreate] = useState(false)

  const { data: rooms, isLoading, isError, refetch, isRefetching } = useRooms()

  const activeRoomId = matchPath('/rooms/:roomId', pathname)?.params.roomId ?? null

  let body: ReactNode
  if (isLoading) {
    body = (
      <Center grow={1}>
        <Spinner size='m' color='txt-black-dark' />
      </Center>
    )
  } else if (isError) {
    body = (
      <Center grow={1} paddingHorizontal={24}>
        <VStack align='center' spacing={12}>
          <Text typo='15' bold color='txt-black-darkest'>
            채팅 목록을 불러오지 못했어요
          </Text>
          <Text typo='13' color='txt-black-dark' align='center'>
            네트워크 상태를 확인한 뒤 다시 시도할 수 있어요
          </Text>
          <Button
            text='다시 시도'
            styleVariant='secondary'
            colorVariant='blue'
            size='m'
            loading={isRefetching}
            onClick={() => refetch()}
          />
        </VStack>
      </Center>
    )
  } else if (!rooms || rooms.length === 0) {
    body = (
      <Center grow={1} paddingHorizontal={24}>
        <VStack align='center' spacing={8}>
          <Icon source={ChatBubbleAltIcon} size='xl' color='txt-black-dark' />
          <Text typo='15' bold color='txt-black-darkest'>
            아직 대화가 없어요
          </Text>
          <Text typo='13' color='txt-black-dark' align='center'>
            오른쪽 아래 새 채팅 버튼으로 대화를 시작할 수 있어요
          </Text>
        </VStack>
      </Center>
    )
  } else {
    body = (
      <Box grow={1} minHeight={0} overflowY='auto' paddingHorizontal={8} paddingTop={4}>
        {rooms.map((room) => (
          <RoomListItem
            key={room.id}
            room={room}
            active={room.id === activeRoomId}
            onClick={() => navigate(`/rooms/${room.id}`)}
          />
        ))}
        <Box aria-hidden height={FAB_CLEARANCE} />
      </Box>
    )
  }

  return (
    <VStack
      align='stretch'
      position='relative'
      height='100%'
      overflow='hidden'
      backgroundColor='bg-white-normal'
    >
      {isMobile && (
        <HStack align='center' justify='between' paddingLeft={16} paddingRight={8} paddingVertical={8}>
          <Text typo='18' bold color='txt-black-darkest'>
            인택톡
          </Text>
          <HStack align='center' spacing={4}>
            <AlphaIconButton
              content={SearchIcon}
              aria-label='검색'
              size='m'
              variant='tertiary'
              color='dark-grey'
              onClick={() => navigate('/search')}
            />
            <AlphaIconButton
              content={SettingsIcon}
              aria-label='설정'
              size='m'
              variant='tertiary'
              color='dark-grey'
              onClick={() => navigate('/settings')}
            />
          </HStack>
        </HStack>
      )}

      {!socketConnected && (
        <Box paddingVertical={6} paddingHorizontal={16} backgroundColor='bg-grey-lightest'>
          <Text as='p' typo='12' color='txt-black-dark' align='center'>
            연결 중...
          </Text>
        </Box>
      )}

      {body}

      <AlphaFloatingIconButton
        content={PlusIcon}
        aria-label='새 채팅'
        size='l'
        variant='primary'
        color='blue'
        onClick={() => setShowCreate(true)}
        style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 'var(--z-index-floating)' }}
      />

      <CreateRoomModal show={showCreate} onHide={() => setShowCreate(false)} />
    </VStack>
  )
}
