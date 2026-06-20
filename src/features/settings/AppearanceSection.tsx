import { SegmentedControl, SegmentedControlItem, Text, VStack } from '@channel.io/bezier-react'

import { useUiStore, type ThemePreference } from '@/stores/uiStore'

/** 설정 §화면 — 라이트/다크/시스템 테마 선택 */
export function AppearanceSection() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  return (
    <VStack align="stretch" spacing={8}>
      <Text typo="13" color="txt-black-dark">
        테마
      </Text>
      <SegmentedControl<'radiogroup', ThemePreference>
        type="radiogroup"
        size="m"
        width="100%"
        value={theme}
        onValueChange={setTheme}
        aria-label="테마"
      >
        <SegmentedControlItem value="light">라이트</SegmentedControlItem>
        <SegmentedControlItem value="dark">다크</SegmentedControlItem>
        <SegmentedControlItem value="system">시스템</SegmentedControlItem>
      </SegmentedControl>
    </VStack>
  )
}
