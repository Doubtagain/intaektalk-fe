import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RoomEmptyPane } from '@/pages/RoomEmptyPane'
import { RoomPage } from '@/pages/RoomPage'
import { SearchPage } from '@/pages/SearchPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { OnboardingOnly, PublicOnly, RequireAuth, RequireOnboarded } from './guards'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <OnboardingOnly>
        <OnboardingPage />
      </OnboardingOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <AppLayout />
        </RequireOnboarded>
      </RequireAuth>
    ),
    children: [
      // 데스크톱: 분할 뷰 우측 패널 / 모바일: 단독 화면 (AppLayout 이 분기)
      { index: true, element: <RoomEmptyPane /> },
      { path: 'rooms/:roomId', element: <RoomPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
