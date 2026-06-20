import { useEffect, useRef, useState } from 'react'

import {
  Avatar,
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
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  SectionLabel,
  Select,
  Spinner,
  Text,
  TextField,
  VStack,
  useToast,
  type SelectRef,
} from '@channel.io/bezier-react'
import { PlusIcon } from '@channel.io/bezier-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { AvatarUploader } from '@/components/AvatarUploader'
import { useRoom } from '@/hooks/queries'
import { roomsApi } from '@/lib/api/endpoints'
import type { MemberRole, Room, RoomMember, User } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'
import { getRoomDisplayName } from '@/lib/roomDisplay'
import { upsertRoom } from '@/lib/socket/cache'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'

import { MemberPicker } from './MemberPicker'

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: '방장',
  ADMIN: '관리자',
  MEMBER: '멤버',
}

interface RoleSelectProps {
  value: MemberRole
  disabled: boolean
  onSelect: (role: MemberRole) => void
}

/** OWNER 전용 역할 토글 (ADMIN ↔ MEMBER) */
function RoleSelect({ value, disabled, onSelect }: RoleSelectProps) {
  const selectRef = useRef<SelectRef | null>(null)
  return (
    <Select
      ref={selectRef}
      size="xs"
      text={ROLE_LABEL[value]}
      disabled={disabled}
      dropdownZIndex="modal"
      aria-label="역할 변경"
      style={{ width: 88 }}
    >
      <VStack spacing={2} align="stretch" style={{ padding: 4 }}>
        {(['ADMIN', 'MEMBER'] as const).map((role) => (
          <ListItem
            key={role}
            size="xs"
            content={ROLE_LABEL[role]}
            active={value === role}
            onClick={() => {
              selectRef.current?.handleHideDropdown()
              if (role !== value) onSelect(role)
            }}
          />
        ))}
      </VStack>
    </Select>
  )
}

interface RoomManageModalProps {
  roomId: string
  show: boolean
  onHide: () => void
}

/**
 * 채팅방 관리 모달 (instrument.md §5.5) — 대화방 헤더의 설정 버튼이 연다.
 * GROUP 전용: OWNER/ADMIN 은 방 정보·멤버·초대를 관리하고, MEMBER 는 열람 + 나가기만 가능.
 */
export function RoomManageModal({ roomId, show, onHide }: RoomManageModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const myUserId = useAuthStore((state) => state.user?.id)
  const onlineByUser = usePresenceStore((state) => state.onlineByUser)

  const { data: room, isLoading } = useRoom(roomId)

  const members = room?.members ?? []
  const myRole = members.find((member) => member.userId === myUserId)?.role
  const isOwner = myRole === 'OWNER'
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'
  const isGroup = room?.type === 'GROUP'

  // 방 정보
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)

  // 멤버 관리
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null)
  const [kickTarget, setKickTarget] = useState<RoomMember | null>(null)
  const [kicking, setKicking] = useState(false)

  // 멤버 초대
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitees, setInvitees] = useState<User[]>([])
  const [inviteKey, setInviteKey] = useState(0)
  const [adding, setAdding] = useState(false)

  // 나가기
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // 모달이 열릴 때 입력/확인 상태 초기화
  useEffect(() => {
    if (!show) return
    setInviteOpen(false)
    setInvitees([])
    setInviteKey((key) => key + 1)
    setKickTarget(null)
    setShowLeaveConfirm(false)
  }, [show])

  // 방 이름 드래프트 동기화 (열릴 때 + 방 데이터 도착 시)
  const loadedRoomId = room?.id
  const loadedRoomName = room?.name ?? ''
  useEffect(() => {
    if (show && loadedRoomId) setNameDraft(loadedRoomName)
    // 사용자가 입력 중인 드래프트를 보존하기 위해 name 변경에는 반응하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, loadedRoomId])

  const handleAvatarChange = (avatarMediaId: string) => {
    void (async () => {
      setSavingAvatar(true)
      try {
        const updated = await roomsApi.update(roomId, { avatarMediaId })
        upsertRoom(queryClient, updated)
      } catch {
        toast.addToast('방 사진을 변경하지 못했습니다.', { preset: 'error' })
      } finally {
        setSavingAvatar(false)
      }
    })()
  }

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || savingName) return
    setSavingName(true)
    try {
      const updated = await roomsApi.update(roomId, { name: trimmed })
      upsertRoom(queryClient, updated)
      toast.addToast('방 이름을 변경했습니다.', { preset: 'success' })
    } catch {
      toast.addToast('방 이름을 변경하지 못했습니다.', { preset: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  const handleChangeRole = async (member: RoomMember, role: MemberRole) => {
    setPendingRoleUserId(member.userId)
    try {
      await roomsApi.changeRole(roomId, member.userId, role)
      await queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId), exact: true })
    } catch {
      toast.addToast('역할을 변경하지 못했습니다.', { preset: 'error' })
    } finally {
      setPendingRoleUserId(null)
    }
  }

  const handleKick = async () => {
    if (!kickTarget || kicking) return
    setKicking(true)
    try {
      await roomsApi.removeMember(roomId, kickTarget.userId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId), exact: true })
      setKickTarget(null)
    } catch {
      toast.addToast('멤버를 내보내지 못했습니다.', { preset: 'error' })
    } finally {
      setKicking(false)
    }
  }

  const handleAddMembers = async () => {
    if (invitees.length === 0 || adding) return
    setAdding(true)
    try {
      const updated = await roomsApi.addMembers(
        roomId,
        invitees.map((user) => user.id),
      )
      upsertRoom(queryClient, updated)
      await queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId), exact: true })
      setInvitees([])
      setInviteKey((key) => key + 1)
      setInviteOpen(false)
      toast.addToast('멤버를 추가했습니다.', { preset: 'success' })
    } catch {
      toast.addToast('멤버를 추가하지 못했습니다.', { preset: 'error' })
    } finally {
      setAdding(false)
    }
  }

  const handleLeave = async () => {
    if (leaving || !myUserId) return
    setLeaving(true)
    try {
      await roomsApi.leave(roomId, myUserId)
      queryClient.setQueryData<Room[]>(queryKeys.rooms, (rooms) =>
        rooms?.filter((item) => item.id !== roomId),
      )
      setShowLeaveConfirm(false)
      onHide()
      navigate('/')
      queryClient.removeQueries({ queryKey: queryKeys.room(roomId) })
    } catch {
      toast.addToast('방을 나가지 못했습니다.', { preset: 'error' })
    } finally {
      setLeaving(false)
    }
  }

  const renderMemberActions = (member: RoomMember) => {
    if (!isGroup || member.userId === myUserId || member.role === 'OWNER') return null
    const roleControl = isOwner ? (
      <RoleSelect
        value={member.role}
        disabled={pendingRoleUserId === member.userId}
        onSelect={(role) => void handleChangeRole(member, role)}
      />
    ) : null
    const kickButton =
      canManage && member.role === 'MEMBER' ? (
        <Button
          size="xs"
          styleVariant="tertiary"
          colorVariant="red"
          text="내보내기"
          onClick={() => setKickTarget(member)}
        />
      ) : null
    if (!roleControl && !kickButton) return null
    return (
      <HStack spacing={4} align="center">
        {roleControl}
        {kickButton}
      </HStack>
    )
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <Center style={{ height: 200 }}>
          <Spinner size="m" color="txt-black-dark" />
        </Center>
      )
    }
    if (!room) {
      return (
        <Center style={{ height: 200 }}>
          <Text typo="14" color="txt-black-dark">
            방 정보를 불러오지 못했습니다.
          </Text>
        </Center>
      )
    }
    return (
      <VStack spacing={16} align="stretch">
        {isGroup && (
          <>
            <SectionLabel content="방 정보" />
            <HStack spacing={16} align="start">
              <AvatarUploader
                name={getRoomDisplayName(room, myUserId)}
                value={room.avatarUrl}
                onChange={handleAvatarChange}
                size="72"
                disabled={!canManage || savingAvatar}
              />
              <VStack spacing={8} align="stretch" grow={1}>
                <FormControl readOnly={!canManage}>
                  <FormLabel>방 이름</FormLabel>
                  <TextField
                    size="m"
                    placeholder="방 이름"
                    maxLength={60}
                    readOnly={!canManage}
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                </FormControl>
                <HStack justify="end">
                  <Button
                    size="s"
                    styleVariant="primary"
                    colorVariant="blue"
                    text="저장"
                    disabled={
                      !canManage || !nameDraft.trim() || nameDraft.trim() === (room.name ?? '')
                    }
                    loading={savingName}
                    onClick={() => void handleSaveName()}
                  />
                </HStack>
              </VStack>
            </HStack>
          </>
        )}

        <SectionLabel content={`멤버 ${members.length}`} />
        {members.length === 0 ? (
          <Center style={{ height: 64 }}>
            <Text typo="13" color="txt-black-dark">
              표시할 멤버가 없습니다.
            </Text>
          </Center>
        ) : (
          <VStack spacing={2} align="stretch" maxHeight={240} overflowY="auto">
            {members.map((member) => {
              const isMe = member.userId === myUserId
              return (
                <ListItem
                  key={member.userId}
                  size="m"
                  content={isMe ? `${member.user.nickname} (나)` : member.user.nickname}
                  description={ROLE_LABEL[member.role]}
                  leftContent={
                    <Avatar
                      name={member.user.nickname}
                      avatarUrl={member.user.avatarUrl ?? undefined}
                      size="30"
                      status={onlineByUser[member.userId] ? 'online' : undefined}
                    />
                  }
                  rightContent={renderMemberActions(member)}
                />
              )
            })}
          </VStack>
        )}

        {isGroup && canManage && (
          <>
            <SectionLabel content="멤버 초대" />
            <HStack justify="start">
              <Button
                styleVariant="secondary"
                colorVariant="blue"
                size="s"
                leftContent={PlusIcon}
                text={inviteOpen ? '초대 닫기' : '멤버 초대'}
                active={inviteOpen}
                onClick={() => setInviteOpen((open) => !open)}
              />
            </HStack>
            {inviteOpen && (
              <VStack spacing={12} align="stretch">
                <MemberPicker
                  key={inviteKey}
                  selected={invitees}
                  onChange={setInvitees}
                  excludeUserIds={members.map((member) => member.userId)}
                />
                <HStack justify="end">
                  <Button
                    size="s"
                    styleVariant="primary"
                    colorVariant="blue"
                    text={invitees.length > 0 ? `${invitees.length}명 추가` : '추가'}
                    disabled={invitees.length === 0}
                    loading={adding}
                    onClick={() => void handleAddMembers()}
                  />
                </HStack>
              </VStack>
            )}
          </>
        )}

        <Divider />
        <Button
          styleVariant="secondary"
          colorVariant="red"
          text="방 나가기"
          onClick={() => setShowLeaveConfirm(true)}
        />
      </VStack>
    )
  }

  return (
    <>
      <Modal show={show} onHide={onHide}>
        <ModalContent showCloseIcon width={480}>
          <ModalHeader title="채팅방 관리" />
          <ModalBody>{renderBody()}</ModalBody>
        </ModalContent>
      </Modal>

      {/* 멤버 내보내기 확인 */}
      <ConfirmModal show={kickTarget !== null} onHide={() => setKickTarget(null)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title={kickTarget ? `${kickTarget.user.nickname}님을 내보낼까요?` : ''}
            description="내보낸 멤버는 다시 초대하기 전까지 이 방에 참여할 수 없습니다."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  disabled={kicking}
                  onClick={() => setKickTarget(null)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="내보내기"
                  loading={kicking}
                  onClick={() => void handleKick()}
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>

      {/* 방 나가기 확인 */}
      <ConfirmModal show={showLeaveConfirm} onHide={() => setShowLeaveConfirm(false)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title="이 방을 나갈까요?"
            description="대화 내용은 복구할 수 없어요."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  disabled={leaving}
                  onClick={() => setShowLeaveConfirm(false)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="나가기"
                  loading={leaving}
                  onClick={() => void handleLeave()}
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>
    </>
  )
}
