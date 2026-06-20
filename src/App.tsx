import { AppProvider, SmoothCornersFeature, ToastProvider } from '@channel.io/bezier-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { useResolvedTheme } from '@/hooks/useResolvedTheme'
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap'
import { SocketProvider } from '@/lib/socket/SocketProvider'
import { router } from '@/routes/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  const themeName = useResolvedTheme()
  useSessionBootstrap()

  return (
    <AppProvider themeName={themeName} features={[SmoothCornersFeature]}>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <RouterProvider router={router} />
          </SocketProvider>
        </QueryClientProvider>
      </ToastProvider>
    </AppProvider>
  )
}
