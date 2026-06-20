import type { ReactNode } from 'react'

import { Avatar, AvatarGroup, Badge, HStack, ListItem, Text, VStack } from '@channel.io/bezier-react'

import type { Room } from '@/lib/api/types'
import { formatRoomListTime } from '@/lib/format'
import { getDirectPeer, getPreviewText, getRoomDisplayName } from '@/lib/roomDisplay'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'

/** 그룹 아바타 묶음에 보여줄 최대 인원 (초과분은 +N 으로 표시) */
const GROUP_AVATAR_MAX = 2

function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}

interface RoomListItemProps {
  room: Room
  active: boolean
  onClick: () => void
}

export function RoomListItem({ room, active, onClick }: RoomListItemProps) {
  const myUserId = useAuthStore((s) => s.user?.id)
  const typingUsers = usePresenceStore((s) => s.typingByRoom[room.id])

  const peer = getDirectPeer(room, myUserId)
  const peerOnline = usePresenceStore((s) => (peer ? s.onlineByUser[peer.id] === true : false))

  const displayName = getRoomDisplayName(room, myUserId)
  const someoneTyping = Object.keys(typingUsers ?? {}).some((userId) => userId !== myUserId)
  const previewText = getPreviewText(room.lastMessage)

  let leftContent: ReactNode
  if (room.type === 'DIRECT') {
    leftContent = (
      <Avatar
        name={displayName}
        avatarUrl={peer?.avatarUrl ?? undefined}
        size='42'
        status={peerOnline ? 'online' : undefined}
      />
    )
  } else if (room.avatarUrl) {
    leftContent = <Avatar name={displayName} avatarUrl={room.avatarUrl} size='42' />
  } else if (room.members && room.members.length > 0) {
    leftContent = (
      <AvatarGroup max={GROUP_AVATAR_MAX} size='30' spacing={-8} ellipsisType='count'>
        {room.members.map((member) => (
          <Avatar
            key={member.userId}
            name={member.user.nickname}
            avatarUrl={member.user.avatarUrl ?? undefined}
          />
        ))}
      </AvatarGroup>
    )
  } else {
    leftContent = <Avatar name={displayName} size='42' />
  }

  let description: ReactNode
  if (someoneTyping) {
    description = (
      <Text typo='13' color='bgtxt-blue-normal'>
        입력 중...
      </Text>
    )
  } else if (previewText) {
    // 문자열로 넘기면 ListItem 이 기본 보조 텍스트 스타일로 렌더한다
    description = previewText
  }

  return (
    <ListItem
      size='l'
      variant='blue'
      active={active}
      onClick={onClick}
      leftContent={leftContent}
      content={
        <HStack align='center' spacing={4} minWidth={0} maxWidth='100%'>
          <Text typo='15' bold truncated color='txt-black-darkest' style={{ minWidth: 0 }}>
            {displayName}
          </Text>
          {room.type === 'GROUP' && (
            <Text typo='12' color='txt-black-dark' style={{ flexShrink: 0 }}>
              {room.memberCount}
            </Text>
          )}
        </HStack>
      }
      description={description}
      descriptionMaxLines={1}
      rightContent={
        <VStack align='end' spacing={4}>
          {room.lastMessageAt != null && (
            <Text typo='11' color='txt-black-dark'>
              {formatRoomListTime(room.lastMessageAt)}
            </Text>
          )}
          {room.unreadCount > 0 && (
            <Badge size='xs' variant='blue'>
              {formatUnreadCount(room.unreadCount)}
            </Badge>
          )}
        </VStack>
      }
    />
  )
}
