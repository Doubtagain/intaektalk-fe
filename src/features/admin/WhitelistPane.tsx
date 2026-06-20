import { useState } from 'react'

import {
  Button,
  Center,
  ConfirmModal,
  ConfirmModalContent,
  ConfirmModalFooter,
  ConfirmModalHeader,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  ListItem,
  SectionLabel,
  Spinner,
  Text,
  TextField,
  VStack,
  useToast,
} from '@channel.io/bezier-react'
import { useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/lib/api/endpoints'
import type { Whitelist, WhitelistStatus } from '@/lib/api/types'
import { formatRoomListTime } from '@/lib/format'

import { useWhitelistInfinite } from './queries'

const STATUS_LABEL: Record<WhitelistStatus, string> = {
  INVITED: '초대됨',
  ACTIVE: '활성',
  BLOCKED: '차단됨',
}

const FILTERS: { label: string; value?: WhitelistStatus }[] = [
  { label: '전체' },
  { label: '초대됨', value: 'INVITED' },
  { label: '활성', value: 'ACTIVE' },
  { label: '차단됨', value: 'BLOCKED' },
]

/** admin 쿼리 전체 무효화 키 접두사 */
const WHITELIST_KEY = ['admin', 'whitelist'] as const

/** 화이트리스트 관리 — kakaoId/identifier 등록, 상태 필터, 차단/해제/삭제 */
export function WhitelistPane() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<WhitelistStatus | undefined>(undefined)
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useWhitelistInfinite(status)

  // 등록 폼
  const [kakaoId, setKakaoId] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)

  // 행 동작
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<Whitelist | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Whitelist | null>(null)

  const items = data?.pages.flatMap((page) => page.items) ?? []
  const invalidate = () => queryClient.invalidateQueries({ queryKey: WHITELIST_KEY })

  const handleCreate = async () => {
    const kid = kakaoId.trim()
    const idf = identifier.trim()
    if (!kid && !idf) {
      toast.addToast('kakaoId 또는 식별자 중 하나는 입력해야 합니다.', { preset: 'error' })
      return
    }
    if (creating) return
    setCreating(true)
    try {
      await adminApi.whitelist.create({
        ...(kid ? { kakaoId: kid } : {}),
        ...(idf ? { identifier: idf } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      await invalidate()
      setKakaoId('')
      setIdentifier('')
      setNote('')
      toast.addToast('화이트리스트에 등록했습니다.', { preset: 'success' })
    } catch {
      toast.addToast('등록하지 못했습니다. (이미 등록된 kakaoId일 수 있습니다)', { preset: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handleSetStatus = async (entry: Whitelist, next: WhitelistStatus, successMsg: string) => {
    if (pendingId) return
    setPendingId(entry.id)
    try {
      await adminApi.whitelist.update(entry.id, { status: next })
      await invalidate()
      setBlockTarget(null)
      toast.addToast(successMsg, { preset: 'success' })
    } catch {
      toast.addToast('상태를 변경하지 못했습니다.', { preset: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || pendingId) return
    setPendingId(deleteTarget.id)
    try {
      await adminApi.whitelist.remove(deleteTarget.id)
      await invalidate()
      setDeleteTarget(null)
      toast.addToast('삭제했습니다.', { preset: 'success' })
    } catch {
      toast.addToast('삭제하지 못했습니다.', { preset: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  const renderList = () => {
    if (isLoading) {
      return (
        <Center style={{ height: 160 }}>
          <Spinner size="m" color="txt-black-dark" />
        </Center>
      )
    }
    if (isError) {
      return (
        <Center style={{ height: 160 }}>
          <Text typo="14" color="txt-black-dark">
            목록을 불러오지 못했습니다.
          </Text>
        </Center>
      )
    }
    if (items.length === 0) {
      return (
        <Center style={{ height: 160 }}>
          <Text typo="14" color="txt-black-dark">
            등록된 항목이 없습니다.
          </Text>
        </Center>
      )
    }
    return (
      <VStack spacing={2} align="stretch">
        {items.map((entry) => {
          const isBlocked = entry.status === 'BLOCKED'
          return (
            <ListItem
              key={entry.id}
              size="m"
              content={entry.kakaoId ?? entry.identifier ?? '(미상)'}
              description={`${STATUS_LABEL[entry.status]}${entry.note ? ` · ${entry.note}` : ''} · ${formatRoomListTime(entry.createdAt)}`}
              rightContent={
                <HStack spacing={4} align="center">
                  {isBlocked ? (
                    <Button
                      size="xs"
                      styleVariant="secondary"
                      colorVariant="blue"
                      text="차단 해제"
                      loading={pendingId === entry.id}
                      disabled={pendingId !== null && pendingId !== entry.id}
                      onClick={() => void handleSetStatus(entry, 'ACTIVE', '차단을 해제했습니다.')}
                    />
                  ) : (
                    <Button
                      size="xs"
                      styleVariant="tertiary"
                      colorVariant="red"
                      text="차단"
                      disabled={pendingId !== null}
                      onClick={() => setBlockTarget(entry)}
                    />
                  )}
                  <Button
                    size="xs"
                    styleVariant="tertiary"
                    colorVariant="monochrome-dark"
                    text="삭제"
                    disabled={pendingId !== null}
                    onClick={() => setDeleteTarget(entry)}
                  />
                </HStack>
              }
            />
          )
        })}

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
    )
  }

  return (
    <VStack spacing={16} align="stretch">
      <SectionLabel content="등록" />
      <VStack spacing={8} align="stretch">
        <HStack spacing={8} align="start">
          <FormControl>
            <FormLabel>kakaoId</FormLabel>
            <TextField
              size="m"
              placeholder="카카오 회원번호"
              value={kakaoId}
              onChange={(event) => setKakaoId(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>식별자(선택)</FormLabel>
            <TextField
              size="m"
              placeholder="이메일/전화 등"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </FormControl>
        </HStack>
        <FormControl>
          <FormLabel>메모(선택)</FormLabel>
          <TextField
            size="m"
            placeholder="메모"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </FormControl>
        <HStack justify="end">
          <Button
            size="s"
            styleVariant="primary"
            colorVariant="blue"
            text="등록"
            loading={creating}
            disabled={!kakaoId.trim() && !identifier.trim()}
            onClick={() => void handleCreate()}
          />
        </HStack>
      </VStack>

      <Divider />

      <HStack spacing={4} align="center">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="s"
            text={filter.label}
            styleVariant={status === filter.value ? 'primary' : 'tertiary'}
            colorVariant={status === filter.value ? 'blue' : 'monochrome-dark'}
            onClick={() => setStatus(filter.value)}
          />
        ))}
      </HStack>

      {renderList()}

      {/* 차단 확인 */}
      <ConfirmModal show={blockTarget !== null} onHide={() => setBlockTarget(null)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title="이 사용자를 차단할까요?"
            description="차단 시 해당 사용자의 세션이 즉시 무효화되고 다시 로그인할 수 없습니다."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  disabled={pendingId !== null}
                  onClick={() => setBlockTarget(null)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="차단"
                  loading={pendingId !== null && pendingId === blockTarget?.id}
                  onClick={() =>
                    blockTarget && void handleSetStatus(blockTarget, 'BLOCKED', '차단했습니다.')
                  }
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>

      {/* 삭제 확인 */}
      <ConfirmModal show={deleteTarget !== null} onHide={() => setDeleteTarget(null)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title="이 항목을 삭제할까요?"
            description="삭제해도 이미 가입한 사용자의 세션은 끊기지 않습니다. 접근을 막으려면 '차단'을 사용하세요."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  disabled={pendingId !== null}
                  onClick={() => setDeleteTarget(null)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="삭제"
                  loading={pendingId !== null && pendingId === deleteTarget?.id}
                  onClick={() => void handleDelete()}
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>
    </VStack>
  )
}
