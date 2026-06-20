import { SegmentedControl, SegmentedControlItem, Text, VStack } from '@channel.io/bezier-react'

import { useUiStore, type AutoplayPolicy } from '@/stores/uiStore'

/** 설정 §미디어 — 움짤 자동 재생 정책 (항상 / Wi-Fi에서만 / 안 함) */
export function MediaSection() {
  const autoplay = useUiStore((s) => s.autoplay)
  const setAutoplay = useUiStore((s) => s.setAutoplay)

  return (
    <VStack align="stretch" spacing={8}>
      <Text typo="13" color="txt-black-dark">
        움짤 자동 재생
      </Text>
      <SegmentedControl<'radiogroup', AutoplayPolicy>
        type="radiogroup"
        size="m"
        width="100%"
        value={autoplay}
        onValueChange={setAutoplay}
        aria-label="움짤 자동 재생"
      >
        <SegmentedControlItem value="always">항상</SegmentedControlItem>
        <SegmentedControlItem value="wifi-only">Wi-Fi에서만</SegmentedControlItem>
        <SegmentedControlItem value="never">안 함</SegmentedControlItem>
      </SegmentedControl>
    </VStack>
  )
}
