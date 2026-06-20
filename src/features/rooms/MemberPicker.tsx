import { useEffect, useState } from 'react'

import {
  Avatar,
  AvatarGroup,
  Center,
  CheckableAvatar,
  HStack,
  Spinner,
  Text,
  TextField,
  VStack,
} from '@channel.io/bezier-react'
import { SearchIcon } from '@channel.io/bezier-icons'

import { useUserSearch } from '@/hooks/queries'
import type { User } from '@/lib/api/types'

const SEARCH_DEBOUNCE_MS = 300

interface MemberPickerProps {
  /** 선택된 유저 목록 (제어형) */
  selected: User[]
  onChange: (users: User[]) => void
  /** 검색 결과에서 제외할 유저 id (이미 멤버인 유저, 본인 등) */
  excludeUserIds?: string[]
}

/**
 * 멤버 선택 공용 컴포넌트 — 그룹 생성 / 멤버 초대 모달이 재사용한다.
 * 닉네임 검색(300ms 디바운스) → CheckableAvatar 다중 선택 → AvatarGroup 선택 요약.
 * 내부 검색어를 초기화하려면 부모에서 key 를 바꿔 다시 마운트한다.
 */
export function MemberPicker({ selected, onChange, excludeUserIds = [] }: MemberPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isFetching, isError } = useUserSearch(debouncedQuery)

  const hasQuery = debouncedQuery.length > 0
  const results = (data ?? []).filter((user) => !excludeUserIds.includes(user.id))
  const selectedIds = new Set(selected.map((user) => user.id))

  const handleToggle = (user: User, checked: boolean) => {
    if (checked) {
      if (!selectedIds.has(user.id)) onChange([...selected, user])
    } else {
      onChange(selected.filter((item) => item.id !== user.id))
    }
  }

  const renderResults = () => {
    if (!hasQuery) {
      return (
        <Center style={{ height: 96 }}>
          <Text typo="13" color="txt-black-dark">
            이름으로 검색해 멤버를 선택할 수 있습니다.
          </Text>
        </Center>
      )
    }
    if (isFetching) {
      return (
        <Center style={{ height: 96 }}>
          <Spinner size="m" color="txt-black-dark" />
        </Center>
      )
    }
    if (isError) {
      return (
        <Center style={{ height: 96 }}>
          <Text typo="13" color="txt-black-dark">
            검색에 실패했습니다. 잠시 후 다시 검색해 주세요.
          </Text>
        </Center>
      )
    }
    if (results.length === 0) {
      return (
        <Center style={{ height: 96 }}>
          <Text typo="13" color="txt-black-dark">
            검색 결과가 없어요
          </Text>
        </Center>
      )
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
        {results.map((user) => (
          <VStack key={user.id} spacing={4} align="center" style={{ width: 64 }}>
            <CheckableAvatar
              name={user.nickname}
              avatarUrl={user.avatarUrl ?? undefined}
              size="48"
              checked={selectedIds.has(user.id)}
              onCheckedChange={(checked) => handleToggle(user, checked)}
              aria-label={`${user.nickname} 선택`}
            />
            <Text typo="12" color="txt-black-darker" truncated style={{ maxWidth: 64 }}>
              {user.nickname}
            </Text>
          </VStack>
        ))}
      </div>
    )
  }

  return (
    <VStack spacing={12} align="stretch">
      <TextField
        type="search"
        size="m"
        variant="primary"
        allowClear
        placeholder="이름으로 검색"
        leftContent={{ icon: SearchIcon }}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="멤버 검색"
      />

      <div style={{ minHeight: 96, maxHeight: 192, overflowY: 'auto' }}>{renderResults()}</div>

      {selected.length > 0 && (
        <HStack spacing={8} align="center">
          <AvatarGroup max={5} ellipsisType="count" size="24" spacing={-6}>
            {selected.map((user) => (
              <Avatar key={user.id} name={user.nickname} avatarUrl={user.avatarUrl ?? undefined} />
            ))}
          </AvatarGroup>
          <Text typo="12" color="txt-black-darker">
            {selected.length}명 선택
          </Text>
        </HStack>
      )}
    </VStack>
  )
}
