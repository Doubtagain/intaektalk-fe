import { Avatar, ListItem, Text, VStack } from '@channel.io/bezier-react'

import type { User } from '@/lib/api/types'
import { usePresenceStore } from '@/stores/presenceStore'

interface UserSearchResultsProps {
  users: User[]
  /** 1:1 방 생성 진행 중인 사용자 id (그동안 다른 행은 비활성) */
  busyUserId: string | null
  onSelect: (user: User) => void
}

/** 검색 결과 목록 — ListItem 행 클릭 시 1:1 방 생성/이동 */
export function UserSearchResults({ users, busyUserId, onSelect }: UserSearchResultsProps) {
  const onlineByUser = usePresenceStore((s) => s.onlineByUser)

  return (
    <VStack as="ul" align="stretch" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {users.map((user) => (
        <li key={user.id}>
          <ListItem
            size="l"
            leftContent={
              <Avatar
                name={user.nickname}
                avatarUrl={user.avatarUrl ?? undefined}
                size="42"
                status={onlineByUser[user.id] ? 'online' : 'offline'}
              />
            }
            content={
              <Text typo="15" bold truncated>
                {user.nickname}
              </Text>
            }
            description={user.statusMessage ?? undefined}
            descriptionMaxLines={1}
            disabled={busyUserId !== null && busyUserId !== user.id}
            onClick={() => onSelect(user)}
          />
        </li>
      ))}
    </VStack>
  )
}
