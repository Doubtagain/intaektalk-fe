import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'

import '@channel.io/bezier-react/styles.css'
import '@/styles/global.css'

import { App } from '@/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: 프로덕션에서만 서비스 워커 등록
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 앱 동작에 치명적이지 않다
    })
  })
}
