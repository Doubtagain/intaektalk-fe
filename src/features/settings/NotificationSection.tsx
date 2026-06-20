import { useEffect, useState } from 'react'

import { NotificationIcon } from '@channel.io/bezier-icons'
import { HStack, KeyValueItem, Switch, Text, VStack, useToast } from '@channel.io/bezier-react'

import { getPushStatus, registerPush, unregisterPush, type PushStatus } from '@/lib/push'
import { useUiStore } from '@/stores/uiStore'

const PUSH_STATUS_LABEL: Record<PushStatus, string> = {
  subscribed: '구독됨',
  unsubscribed: '해제됨',
  denied: '권한 거부',
  unsupported: '미지원',
}

/** 설정 §알림 — 알림 스위치(웹 푸시 등록/해제) + 푸시 등록 상태 표시 */
export function NotificationSection() {
  const notificationsEnabled = useUiStore((s) => s.notificationsEnabled)
  const setNotificationsEnabled = useUiStore((s) => s.setNotificationsEnabled)
  const toast = useToast()

  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getPushStatus().then((status) => {
      if (!cancelled) setPushStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = async (checked: boolean) => {
    if (updating) return
    setUpdating(true)
    try {
      if (checked) {
        setNotificationsEnabled(true)
        const permission = await registerPush()
        if (permission === 'denied') {
          // 권한이 거부되면 스위치를 원복한다
          setNotificationsEnabled(false)
          toast.addToast('브라우저 알림 권한이 필요해요', { preset: 'error' })
        } else if (permission === 'unsupported') {
          toast.addToast('이 브라우저는 푸시 알림을 지원하지 않아요')
        }
      } else {
        setNotificationsEnabled(false)
        await unregisterPush()
      }
      setPushStatus(await getPushStatus())
    } finally {
      setUpdating(false)
    }
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="between" align="center" paddingVertical={8}>
        <Text typo="15" color="txt-black-darkest">
          알림 받기
        </Text>
        <Switch
          checked={notificationsEnabled}
          onCheckedChange={(checked) => void handleToggle(checked)}
          disabled={updating}
          aria-label="알림 받기"
        />
      </HStack>
      <KeyValueItem keyIcon={NotificationIcon} keyContent="푸시 등록 상태">
        {pushStatus ? PUSH_STATUS_LABEL[pushStatus] : '확인 중'}
      </KeyValueItem>
    </VStack>
  )
}
