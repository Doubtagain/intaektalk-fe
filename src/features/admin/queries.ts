import { useInfiniteQuery } from '@tanstack/react-query'

import { adminApi } from '@/lib/api/endpoints'
import type { AccessRequest, Page, Whitelist, WhitelistStatus } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'

/** 화이트리스트 무한 목록 (status 필터 + createdAt 커서) */
export function useWhitelistInfinite(status?: WhitelistStatus) {
  return useInfiniteQuery<
    Page<Whitelist>,
    Error,
    { pages: Page<Whitelist>[]; pageParams: unknown[] },
    ReturnType<typeof queryKeys.admin.whitelist>,
    string | null
  >({
    queryKey: queryKeys.admin.whitelist(status),
    queryFn: ({ pageParam, signal }) => adminApi.whitelist.list({ status, cursor: pageParam }, signal),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

/** 가입 대기(거부된 로그인) 무한 목록 (createdAt 커서) */
export function useAccessRequestsInfinite() {
  return useInfiniteQuery<
    Page<AccessRequest>,
    Error,
    { pages: Page<AccessRequest>[]; pageParams: unknown[] },
    typeof queryKeys.admin.accessRequests,
    string | null
  >({
    queryKey: queryKeys.admin.accessRequests,
    queryFn: ({ pageParam, signal }) => adminApi.accessRequests.list(pageParam, signal),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
