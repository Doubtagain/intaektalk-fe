import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import {
  AlphaIconButton,
  Avatar,
  AvatarGroup,
  Button,
  Center,
  ConfirmModal,
  ConfirmModalContent,
  ConfirmModalFooter,
  ConfirmModalHeader,
  Divider,
  HStack,
  Spinner,
  Text,
  useToast,
} from '@channel.io/bezier-react'
import { ArrowLeftIcon, MoreVerticalIcon } from '@channel.io/bezier-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { ChatComposer } from '@/components/chat/ChatComposer'
import { DateSeparator } from '@/components/chat/DateSeparator'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ScrollToBottomFab } from '@/components/chat/ScrollToBottomFab'
import { SystemMessage } from '@/components/chat/SystemMessage'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { UnreadDivider } from '@/components/chat/UnreadDivider'
import {
  computeRenderFlags,
  countUnreadMembers,
  type UnreadAnchor,
} from '@/features/room/timeline'
import { useReadSync } from '@/features/room/useReadSync'
import { useRoomSocket } from '@/features/room/useRoomSocket'
import { useSendMessage } from '@/features/room/useSendMessage'
import { RoomManageModal } from '@/features/rooms/RoomManageModal'
import { useMessagesInfinite, useRoom } from '@/hooks/queries'
import { useIsMobile } from '@/hooks/useBreakpoint'
import type { LocalMessage, RoomMember } from '@/lib/api/types'
import { getDirectPeer, getRoomDisplayName } from '@/lib/roomDisplay'
import { markMessageDeleted } from '@/lib/socket/cache'
import { useSocket } from '@/lib/socket/SocketProvider'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'

/** 시각적 하단에서 이만큼 이상 올라가면 "맨 아래로" FAB 표시 */
const SCROLLED_UP_THRESHOLD_PX = 300

/** 대화방(§5.4) — 메시지 무한스크롤 + 실시간 송수신 + 읽음 동기화 */
export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const me = useAuthStore((s) => s.user)

  const { data: room } = useRoom(roomId)
  const messagesQuery = useMessagesInfinite(roomId)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = messagesQuery
  const { sendText, sendMedia, retry, discard } = useSendMessage(roomId)

  useRoomSocket(roomId)

  const [showManage, setShowManage] = useState(false)

  // ---- 내 메시지 삭제 (WS message:delete + 낙관적 placeholder) ----
  const socket = useSocket()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [deleteTarget, setDeleteTarget] = useState<LocalMessage | null>(null)

  const confirmDelete = () => {
    if (!deleteTarget || !roomId) return
    if (!socket) {
      toast.addToast('연결이 끊겨 삭제하지 못했습니다', { preset: 'error' })
      return
    }
    socket.emit('message:delete', { roomId, messageId: deleteTarget.id })
    markMessageDeleted(queryClient, roomId, deleteTarget.id)
    setDeleteTarget(null)
  }

  // pages[0] = 최신 페이지, 각 페이지 seq 내림차순 → flat 순서 그대로 column-reverse 에 렌더
  const items: LocalMessage[] = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data],
  )

  const membersById = useMemo(() => {
    const map = new Map<string, RoomMember>()
    room?.members?.forEach((member) => map.set(member.userId, member))
    return map
  }, [room?.members])

  // ---- 미읽음 구분선 기준: 방 진입 시점의 내 lastReadSeq 를 1회 캡처 ----
  const anchorRef = useRef<UnreadAnchor | null>(null)
  if (roomId && room?.members && me && anchorRef.current?.roomId !== roomId) {
    const mine = room.members.find((member) => member.userId === me.id)
    if (mine) anchorRef.current = { roomId, lastReadSeq: mine.lastReadSeq, entryAt: Date.now() }
  }
  const anchor = anchorRef.current?.roomId === roomId ? anchorRef.current : null

  // ---- 읽음 동기화: 구분선 기준 캡처 후 최신 서버 seq 로 발송 ----
  const latestServerSeq = useMemo(
    () => items.find((message) => !message.localStatus)?.seq,
    [items],
  )
  useReadSync(roomId, anchor ? latestServerSeq : undefined)

  const flagsList = useMemo(
    () =>
      items.map((_, index) =>
        computeRenderFlags(items, index, { hasMoreOlder: !!hasNextPage, anchor }),
      ),
    [items, hasNextPage, anchor],
  )

  // ---- 스크롤 / FAB ----
  const scrollerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [scrolledUp, setScrolledUp] = useState(false)
  const scrolledUpRef = useRef(false)
  const [hasNewWhileAway, setHasNewWhileAway] = useState(false)

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    // column-reverse: scrollTop 0 = 시각적 하단, 위로 갈수록 음수
    const up = Math.abs(el.scrollTop) > SCROLLED_UP_THRESHOLD_PX
    scrolledUpRef.current = up
    setScrolledUp(up)
    if (!up) setHasNewWhileAway(false)
  }

  const newestId = items[0]?.id
  const prevNewestIdRef = useRef<string | undefined>(newestId)
  useEffect(() => {
    if (prevNewestIdRef.current === newestId) return
    prevNewestIdRef.current = newestId
    if (scrolledUpRef.current) setHasNewWhileAway(true)
  }, [newestId])

  // 방 변경 시 스크롤 상태 초기화
  useEffect(() => {
    scrolledUpRef.current = false
    setScrolledUp(false)
    setHasNewWhileAway(false)
    setShowManage(false)
    scrollerRef.current?.scrollTo({ top: 0 })
  }, [roomId])

  const scrollToBottom = () => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setHasNewWhileAway(false)
  }

  // ---- 과거 로드: 시각적 상단(DOM 끝) sentinel 관찰 ----
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root: scrollerRef.current, rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [roomId, hasNextPage, isFetchingNextPage, fetchNextPage, messagesQuery.isLoading])

  // ---- 헤더 표시 정보 ----
  const displayName = room ? getRoomDisplayName(room, me?.id) : ''
  const peer = room && room.type === 'DIRECT' ? getDirectPeer(room, me?.id) : null
  const peerOnline = usePresenceStore((s) => (peer ? !!s.onlineByUser[peer.id] : false))
  const isGroup = room?.type === 'GROUP'
  const isMember = !!me && !!room?.members?.some((member) => member.userId === me.id)
  const canManage = isGroup && isMember

  if (!roomId) return null

  const resolveName = (userId: string) =>
    membersById.get(userId)?.user.nickname ?? '알 수 없음'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
        {isMobile && (
          <AlphaIconButton
            content={ArrowLeftIcon}
            aria-label="뒤로"
            variant="tertiary"
            color="dark-grey"
            size="m"
            onClick={() => navigate('/')}
          />
        )}
        {room ? (
          <>
            {room.type === 'DIRECT' ? (
              <Avatar
                name={displayName}
                avatarUrl={peer?.avatarUrl ?? undefined}
                size="36"
                status={peerOnline ? 'online' : 'offline'}
              />
            ) : (
              <AvatarGroup size="24" max={3} ellipsisType="count">
                {(room.members ?? []).map((member) => (
                  <Avatar
                    key={member.userId}
                    name={member.user.nickname}
                    avatarUrl={member.user.avatarUrl ?? undefined}
                  />
                ))}
              </AvatarGroup>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <Text typo="16" bold color="txt-black-darkest" truncated>
                {displayName}
              </Text>
              {isGroup && (
                <Text typo="12" color="txt-black-dark">
                  멤버 {room.memberCount}
                </Text>
              )}
            </div>
            {canManage && (
              <AlphaIconButton
                content={MoreVerticalIcon}
                aria-label="대화방 관리"
                variant="tertiary"
                color="dark-grey"
                size="m"
                onClick={() => setShowManage(true)}
              />
            )}
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </header>
      <Divider withoutIndent />

      {/* 메시지 영역 */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {messagesQuery.isLoading ? (
          <Center style={{ height: '100%' }}>
            <Spinner size="m" color="txt-black-dark" />
          </Center>
        ) : messagesQuery.isError ? (
          <Center style={{ height: '100%' }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <Text typo="14" color="txt-black-dark">
                메시지를 불러오지 못했습니다
              </Text>
              <Button
                text="다시 시도"
                styleVariant="secondary"
                colorVariant="blue"
                size="s"
                onClick={() => void messagesQuery.refetch()}
              />
            </div>
          </Center>
        ) : (
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            style={{
              height: '100%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column-reverse',
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {/* column-reverse: 첫 자식이 시각적 최하단 */}
            <TypingIndicator room={room} myUserId={me?.id} />
            {items.map((message, index) => {
              const flags = flagsList[index]
              const isMineMsg = !!me && message.senderId === me.id
              const senderUser = message.sender ?? membersById.get(message.senderId)?.user ?? null
              return (
                <Fragment key={message.id}>
                  {message.type === 'SYSTEM' ? (
                    <SystemMessage content={message.content ?? ''} resolveName={resolveName} />
                  ) : (
                    <MessageBubble
                      message={message}
                      isMine={isMineMsg}
                      isGroup={isGroup}
                      showSender={!isMineMsg && isGroup && flags.firstOfGroup}
                      firstOfGroup={flags.firstOfGroup}
                      showTime={flags.showTime}
                      unreadCount={room?.members ? countUnreadMembers(room.members, message) : 0}
                      senderName={senderUser?.nickname ?? '알 수 없음'}
                      senderAvatarUrl={senderUser?.avatarUrl ?? null}
                      replySenderName={
                        message.replyTo ? resolveName(message.replyTo.senderId) : null
                      }
                      mobile={isMobile}
                      onRetry={retry}
                      onDiscard={discard}
                      onRequestDelete={setDeleteTarget}
                    />
                  )}
                  {flags.unreadDividerAbove && <UnreadDivider />}
                  {flags.dateSeparatorLabel && <DateSeparator label={flags.dateSeparatorLabel} />}
                </Fragment>
              )
            })}
            {items.length === 0 && (
              <Center style={{ flex: 1 }}>
                <Text typo="14" color="txt-black-dark">
                  아직 메시지가 없습니다
                </Text>
              </Center>
            )}
            {isFetchingNextPage && (
              <div
                style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: 12 }}
              >
                <Spinner size="s" color="txt-black-dark" />
              </div>
            )}
            {/* 시각적 상단(DOM 끝) — 과거 페이지 로드 sentinel */}
            <div ref={sentinelRef} style={{ flexShrink: 0, height: 1 }} aria-hidden />
          </div>
        )}
        <ScrollToBottomFab
          show={scrolledUp}
          hasNewMessage={hasNewWhileAway}
          onClick={scrollToBottom}
        />
      </div>

      {/* 입력 바 */}
      <ChatComposer
        roomId={roomId}
        onSendText={sendText}
        onSendMedia={(file) => void sendMedia(file)}
      />

      {canManage && (
        <RoomManageModal roomId={roomId} show={showManage} onHide={() => setShowManage(false)} />
      )}

      {/* 메시지 삭제 확인 */}
      <ConfirmModal show={deleteTarget !== null} onHide={() => setDeleteTarget(null)}>
        <ConfirmModalContent width={360}>
          <ConfirmModalHeader
            title="이 메시지를 삭제할까요?"
            description="모든 참여자에게 삭제된 메시지로 표시됩니다."
          />
          <ConfirmModalFooter
            rightContent={
              <HStack spacing={8}>
                <Button
                  styleVariant="tertiary"
                  colorVariant="monochrome-dark"
                  text="취소"
                  onClick={() => setDeleteTarget(null)}
                />
                <Button
                  styleVariant="primary"
                  colorVariant="red"
                  text="삭제"
                  onClick={confirmDelete}
                />
              </HStack>
            }
          />
        </ConfirmModalContent>
      </ConfirmModal>
    </div>
  )
}
