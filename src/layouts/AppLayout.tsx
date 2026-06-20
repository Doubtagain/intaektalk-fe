import { ChatBubbleAltIcon, SearchIcon, SettingsIcon, type BezierIcon } from '@channel.io/bezier-icons'
import { AlphaIconButton, Box, HStack, VStack } from '@channel.io/bezier-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { RoomListPane } from '@/features/roomList/RoomListPane'
import { useBreakpoint } from '@/hooks/useBreakpoint'

/** 레이아웃 치수 (px) */
const NAV_RAIL_WIDTH = 64
const LIST_PANE_WIDTH_DESKTOP = 320
const LIST_PANE_WIDTH_TABLET = 280

interface NavEntry {
  path: string
  label: string
  icon: BezierIcon
  active: boolean
}

/** 좌측 아이콘 내비 레일 — 전체채팅 / 검색 / 설정 */
function NavRail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items: NavEntry[] = [
    {
      path: '/',
      label: '전체 채팅',
      icon: ChatBubbleAltIcon,
      active: pathname === '/' || pathname.startsWith('/rooms'),
    },
    { path: '/search', label: '검색', icon: SearchIcon, active: pathname.startsWith('/search') },
    {
      path: '/settings',
      label: '설정',
      icon: SettingsIcon,
      active: pathname.startsWith('/settings'),
    },
  ]

  return (
    <VStack
      as='nav'
      aria-label='주 내비게이션'
      align='center'
      spacing={8}
      width={NAV_RAIL_WIDTH}
      shrink={0}
      paddingVertical={12}
      backgroundColor='bg-white-low'
      borderColor='bdr-black-light'
      borderRightWidth={1}
    >
      {items.map((item) => (
        <AlphaIconButton
          key={item.path}
          content={item.icon}
          aria-label={item.label}
          aria-current={item.active ? 'page' : undefined}
          size='l'
          variant={item.active ? 'secondary' : 'tertiary'}
          color={item.active ? 'blue' : 'dark-grey'}
          onClick={() => navigate(item.path)}
        />
      ))}
    </VStack>
  )
}

/**
 * 반응형 앱 셸 (instrument.md §5.3·§10)
 * - 데스크톱/태블릿: [내비 레일][채팅 목록 패널][콘텐츠] 3분할
 * - 모바일: 단일 컬럼 — index(/)는 채팅 목록 풀스크린, 그 외 라우트는 콘텐츠 풀스크린
 */
export function AppLayout() {
  const breakpoint = useBreakpoint()
  const { pathname } = useLocation()

  if (breakpoint === 'mobile') {
    return (
      <Box height='100%' backgroundColor='bg-white-normal'>
        {pathname === '/' ? <RoomListPane /> : <Outlet />}
      </Box>
    )
  }

  const listPaneWidth = breakpoint === 'desktop' ? LIST_PANE_WIDTH_DESKTOP : LIST_PANE_WIDTH_TABLET

  return (
    <HStack align='stretch' height='100%' backgroundColor='bg-white-normal'>
      <NavRail />
      <Box
        width={listPaneWidth}
        shrink={0}
        height='100%'
        borderColor='bdr-black-light'
        borderRightWidth={1}
      >
        <RoomListPane />
      </Box>
      <Box grow={1} minWidth={0} height='100%' overflow='hidden'>
        <Outlet />
      </Box>
    </HStack>
  )
}
