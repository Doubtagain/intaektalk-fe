import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { mediaApi, messagesApi, roomsApi, usersApi } from '@/lib/api/endpoints'
import type { MessagesPage } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'

export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms,
    // 방 목록은 첫 페이지(limit 100)만 받아 배열로 다룬다 — 소켓 캐시 헬퍼가 Room[] 로 동작
    queryFn: ({ signal }) => roomsApi.list(undefined, signal).then((page) => page.items),
  })
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.room(roomId ?? ''),
    queryFn: ({ signal }) => roomsApi.detail(roomId!, signal),
    enabled: !!roomId,
  })
}

/** 과거 방향 무한스크롤. pages[0] = 최신 페이지, 각 페이지는 seq 내림차순 */
export function useMessagesInfinite(roomId: string | undefined) {
  return useInfiniteQuery<
    MessagesPage,
    Error,
    { pages: MessagesPage[]; pageParams: unknown[] },
    ReturnType<typeof queryKeys.messages>,
    string | null
  >({
    queryKey: queryKeys.messages(roomId ?? ''),
    queryFn: ({ pageParam, signal }) => messagesApi.list(roomId!, pageParam, signal),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!roomId,
    staleTime: Infinity, // WS 가 캐시를 갱신하므로 자동 리패치 불필요
  })
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.userSearch(q),
    queryFn: ({ signal }) => usersApi.search(q, undefined, signal).then((page) => page.items),
    enabled: q.trim().length > 0,
    staleTime: 10_000,
  })
}

export function useMediaMeta(mediaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.media(mediaId ?? ''),
    queryFn: ({ signal }) => mediaApi.meta(mediaId!, signal),
    enabled: !!mediaId,
    staleTime: Infinity,
  })
}
