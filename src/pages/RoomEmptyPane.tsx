import { ChatBubbleAltIcon } from '@channel.io/bezier-icons'
import { Center, Icon, SmoothCornersBox, Text, VStack } from '@channel.io/bezier-react'

/** 데스크톱 분할 뷰에서 방 미선택 시 우측 패널 placeholder */
export function RoomEmptyPane() {
  return (
    <Center height='100%' backgroundColor='bg-white-normal'>
      <VStack align='center' spacing={16}>
        <SmoothCornersBox
          borderRadius='var(--radius-20)'
          backgroundColor='bg-grey-lightest'
          style={{
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon source={ChatBubbleAltIcon} size='xl' color='txt-black-dark' />
        </SmoothCornersBox>
        <VStack align='center' spacing={4}>
          <Text typo='16' bold color='txt-black-darkest'>
            대화를 선택하세요
          </Text>
          <Text typo='13' color='txt-black-dark' align='center'>
            왼쪽 목록에서 대화를 선택하면 내용이 여기에 표시됩니다
          </Text>
        </VStack>
      </VStack>
    </Center>
  )
}
