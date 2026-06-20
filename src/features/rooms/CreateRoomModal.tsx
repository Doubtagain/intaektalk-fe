import { useState } from 'react'

import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TextField,
  VStack,
  useToast,
} from '@channel.io/bezier-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { roomsApi } from '@/lib/api/endpoints'
import type { CreateRoomDto, User } from '@/lib/api/types'
import { upsertRoom } from '@/lib/socket/cache'
import { useAuthStore } from '@/stores/authStore'

import { MemberPicker } from './MemberPicker'

interface CreateRoomModalProps {
  show: boolean
  onHide: () => void
}

/**
 * 새 채팅 모달 (instrument.md §5.5) — 채팅 목록의 새 채팅 FAB 가 연다.
 * 1명 선택 → 1:1 방 생성(기존 방 있으면 서버가 재사용), 2명 이상 → 그룹 생성.
 */
export function CreateRoomModal({ show, onHide }: CreateRoomModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const myUserId = useAuthStore((state) => state.user?.id)

  const [selected, setSelected] = useState<User[]>([])
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)

  const isGroup = selected.length >= 2

  const resetState = () => {
    setSelected([])
    setName('')
    setPickerKey((key) => key + 1)
  }

  const handleSubmit = async () => {
    const first = selected[0]
    if (!first || submitting) return
    setSubmitting(true)
    try {
      const trimmedName = name.trim()
      const body: CreateRoomDto = isGroup
        ? {
            type: 'GROUP',
            memberUserIds: selected.map((user) => user.id),
            // 미입력 시 name 생략 → 서버가 닉네임 조합으로 정한다
            ...(trimmedName ? { name: trimmedName } : {}),
          }
        : { type: 'DIRECT', memberUserIds: [first.id] }
      const room = await roomsApi.create(body)
      upsertRoom(queryClient, room)
      resetState()
      onHide()
      navigate(`/rooms/${room.id}`)
    } catch {
      toast.addToast('채팅방을 만들지 못했습니다. 다시 시도해 주세요.', { preset: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide}>
      <ModalContent showCloseIcon width={480}>
        <ModalHeader title="새 채팅" />
        <ModalBody>
          <VStack spacing={16} align="stretch">
            <MemberPicker
              key={pickerKey}
              selected={selected}
              onChange={setSelected}
              excludeUserIds={myUserId ? [myUserId] : []}
            />
            {isGroup && (
              <FormControl>
                <FormLabel>그룹 이름</FormLabel>
                <TextField
                  size="m"
                  placeholder="그룹 이름 (선택)"
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <FormHelperText>비워 두면 멤버 닉네임으로 이름이 정해집니다.</FormHelperText>
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter
          rightContent={
            <HStack spacing={8}>
              <Button
                styleVariant="tertiary"
                colorVariant="monochrome-dark"
                text="취소"
                disabled={submitting}
                onClick={onHide}
              />
              <Button
                styleVariant="primary"
                colorVariant="blue"
                text={isGroup ? '그룹 만들기' : '대화 시작'}
                disabled={selected.length === 0}
                loading={submitting}
                onClick={() => void handleSubmit()}
              />
            </HStack>
          }
        />
      </ModalContent>
    </Modal>
  )
}
