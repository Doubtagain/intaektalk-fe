import { useState } from 'react'

import {
  Avatar,
  Button,
  Center,
  ConfirmModal,
  ConfirmModalContent,
  ConfirmModalFooter,
  ConfirmModalHeader,
  HStack,
  ListItem,
  Spinner,
  Text,
  VStack,
  useToast,
} from '@channel.io/bezier-react'
import { useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/lib/api/endpoints'
import type { AccessRequest } from '@/lib/api/types'
import { formatRoomListTime } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'

import { useAccessRequestsInfinite } from './queries'

/** 가입 대기(화이트리스트 미등록으로 로그인 거부된 사용자) 목록 — 승인 시 화이트리스트로 승격 */
export function AccessRequestsPane() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAccessRequestsInfinite()

  // 처리 중인 항목 id (버튼 로딩/중복 클릭 방지)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // 거절 확인 대상
  const [dismissTarget, setDismissTarget] = useState<AccessRequest | null>(null)

  const items = data?.pages.flatMap((page) => page.items) ?? []

  const handleApprove = async (request: AccessRequest) => {
    if (pendingId) return
    setPendingId(request.id)
    try {
      await adminApi.accessRequests.approve(request.id)
      // 승인은 화이트리스트와 대기열 양쪽에 영향 → admin 쿼리 전체 무효화
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.addToast(`${request.nickname ?? '사용자'}님을 승인했습니다.`, { preset: 'success' })
    } catch {
      toast.addToast('승인하지 못했습니다.', { preset: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  const handleDismiss = async () => {
    if (!dismissTarget || pendingId) return
    setPendingId(dismissTarget.id)
    try {
      await adminApi.accessRequests.dismiss(dismissTarget.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.accessRequests })
      setDismissTarget(null)
      toast.addToast('대기 요청을 거절했습니다.', { preset: 'success' })
    } catch {
      toast.addToast('거절하지 못했습니다.', { preset: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) {
    return (
      <Center style={{ height: 200 }}>
        <Spinner size="m" color="txt-black-dark" />
      </Center>
    )
  }
  if (isError) {
    return (
      <Center style={{ height: 200 }}>
        <Text typo="14" color="txt-black-dark">
          목록을 불러오지 못했습니다.
        </Text>
      </Center>
    )
  }
  if (items.length === 0) {
    return (
      <Center style={{ height: 200 }}>
        <Text typo="14" color="txt-black-dark">
          가입 대기 중인 사용자가 없습니다.
        </Text>
      </Center>
    )
  }

  return (
    <>
      <VStack spacing={2} align="stretch">
        {items.map((req) => (
          <ListItem
            key={req.id}
            size="m"
            content={req.nickname || '(닉네임 없음)'}
            description={`kakaoId ${req.kakaoId} · 시도 ${req.attempts}회 · ${formatRoomListTime(req.lastAttemptAt)}`}
            leftContent={
              <Avatar
                name={req.nickname || '?'}
                avatarUrl={req.profileImageUrl ?? undefined}
                size="36"
              />
            }
            rightContent={
              <HStack spacing={4} align="center">
                <Button
                  size="xs"
                  styleVariant="primary"
                  colorVariant="blue"
                  text="승인"
                  loading={pendingId === req.id}
                  disabled={pendingId !== null && pendingId !== req.id}
                  onClick={() => void handleApprove(req)}
                />
                <Button
                  size="xs"
                  styleVariant="tertiary"
                  colorVariant="red"
                  text="거절"
                  disabled={pendingId !== null}
                  onClick={() => setDismissTarget(req)}
                />
              </HStack>
            }
          />
        ))}

        {hasNextPage && (
          <HStack justify="center" paddingVertical={8}>
            <Button
              size="s"
              styleVariant="tertiary"
              colorVariant="monochrome-dark"
              text="더 보기"
              loading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            />
          </HStack>
        )}
      </VStack>

      <ConfirmModal show={dismissTarget !== null} onHide={() => setDismissTarget(null)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title={dismissTarget ? `${dismissTarget.nickname ?? '이 요청'}을(를) 거절할까요?` : ''}
            description="대기 목록에서 삭제됩니다. 같은 사용자가 다시 로그인을 시도하면 다시 목록에 나타납니다."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  disabled={pendingId !== null}
                  onClick={() => setDismissTarget(null)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="거절"
                  loading={pendingId !== null && pendingId === dismissTarget?.id}
                  onClick={() => void handleDismiss()}
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>
    </>
  )
}
