/* 인택톡 서비스 워커 — 미니멀 캐시 + 웹 푸시
 * - 프리캐시 없음. install/activate 는 skipWaiting/clientsClaim 만 수행한다.
 * - /assets/ (해시 파일명 정적 자산): cache-first
 * - 그 외 same-origin GET: 네트워크 우선, 오프라인 시 캐시 폴백
 * - API/소켓 요청은 절대 가로채지 않는다 (다른 origin 전부 + 아래 경로 프리픽스)
 */

const CACHE_NAME = 'intaektalk-v1'

/** same-origin 으로 배포돼도 가로채면 안 되는 백엔드 경로 (백엔드 지시서 v2.0 REST/WS) */
const BYPASS_PREFIXES = [
  '/auth',
  '/profile',
  '/rooms',
  '/users',
  '/media',
  '/push',
  '/ws',
  '/socket.io',
  '/health',
]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 다른 origin(API 서버, 폰트 CDN, presigned 스토리지 등)은 건드리지 않는다
  if (url.origin !== self.location.origin) return
  // same-origin 백엔드 경로(리버스 프록시 배포)도 가로채지 않는다
  if (BYPASS_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) {
    return
  }

  // 정적 자산: cache-first (Vite 가 해시 파일명을 부여하므로 캐시가 안전하다)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })(),
    )
    return
  }

  // 그 외(문서, 아이콘, 매니페스트 등): 네트워크 우선 + 오프라인 캐시 폴백
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      try {
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      } catch (error) {
        const cached = await cache.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const fallback = await cache.match('/')
          if (fallback) return fallback
        }
        throw error
      }
    })(),
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    return
  }
  const title = payload.title || '인택톡'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      data: { roomId: payload.roomId || null },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const roomId = event.notification.data && event.notification.data.roomId
  const targetUrl = roomId ? '/rooms/' + roomId : '/'
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windowClients) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl)
            } catch {
              // 내비게이션 실패는 무시 (포커스는 이미 됐다)
            }
          }
          return
        }
      }
      await self.clients.openWindow(targetUrl)
    })(),
  )
})
