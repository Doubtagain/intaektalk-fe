import { Controller, useForm } from 'react-hook-form'

import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Text,
  TextArea,
  TextField,
  useToast,
  VStack,
} from '@channel.io/bezier-react'

import { AvatarUploader } from '@/components/AvatarUploader'
import { AuthCard } from '@/features/auth/AuthCard'
import { profileApi } from '@/lib/api/endpoints'
import type { User } from '@/lib/api/types'
import { useAuthStore } from '@/stores/authStore'

interface OnboardingFormValues {
  nickname: string
  statusMessage: string
  /** 업로드한 아바타 미디어 id (백엔드는 avatarMediaId 로 받는다) */
  avatarMediaId: string | null
}

/** 온보딩 (/onboarding) — 최초 프로필 생성, instrument.md §5.2 */
export function OnboardingPage() {
  const setUser = useAuthStore((s) => s.setUser)
  const { addToast } = useToast()

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<OnboardingFormValues>({
    defaultValues: { nickname: '', statusMessage: '', avatarMediaId: null },
  })

  const nickname = watch('nickname')

  const onSubmit = handleSubmit(async (values) => {
    try {
      const status = values.statusMessage.trim()
      const created = await profileApi.create({
        nickname: values.nickname.trim(),
        ...(values.avatarMediaId ? { avatarMediaId: values.avatarMediaId } : {}),
        ...(status ? { statusMessage: status } : {}),
      })
      // 온보딩이 성공했으므로 온보딩 완료로 확정한다.
      // (POST /profile 응답이 isOnboarded 를 포함하지 않을 수 있어 명시적으로 true 로 둔다.)
      // isOnboarded=true → OnboardingOnly 가드가 / 로 보낸다.
      const prev = useAuthStore.getState().user
      setUser({ ...prev, ...created, isOnboarded: true } as User)
    } catch {
      addToast('프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.', { preset: 'error' })
    }
  })

  return (
    <AuthCard width={400}>
      <form onSubmit={onSubmit} noValidate>
        <VStack align="stretch" spacing={24}>
          <Text typo="22" bold color="txt-black-darkest">
            프로필을 만들어 주세요
          </Text>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Controller
              name="avatarMediaId"
              control={control}
              render={({ field }) => (
                <AvatarUploader
                  name={nickname.trim() || '나'}
                  value={null}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          <Controller
            name="nickname"
            control={control}
            rules={{
              required: '닉네임을 입력해 주세요.',
              validate: (value) => {
                const trimmed = value.trim()
                if (trimmed.length < 2) return '2자 이상 입력해 주세요.'
                if (trimmed.length > 20) return '20자 이하로 입력해 주세요.'
                return true
              },
            }}
            render={({ field, fieldState }) => (
              <FormControl required hasError={!!fieldState.error} disabled={isSubmitting}>
                <FormLabel>닉네임</FormLabel>
                <TextField
                  size="m"
                  allowClear
                  placeholder="2~20자"
                  maxLength={20}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <FormHelperText>대화에서 표시되는 이름입니다.</FormHelperText>
                <FormErrorMessage>{fieldState.error?.message}</FormErrorMessage>
              </FormControl>
            )}
          />

          <Controller
            name="statusMessage"
            control={control}
            rules={{
              maxLength: { value: 80, message: '상태메시지는 80자 이하로 입력해 주세요.' },
            }}
            render={({ field, fieldState }) => (
              <FormControl hasError={!!fieldState.error} disabled={isSubmitting}>
                <FormLabel>상태메시지</FormLabel>
                <TextArea
                  minRows={3}
                  maxRows={6}
                  placeholder="지금 상태를 적어 둘 수 있습니다. (선택)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <FormHelperText>최대 80자</FormHelperText>
                <FormErrorMessage>{fieldState.error?.message}</FormErrorMessage>
              </FormControl>
            )}
          />

          <Button
            type="submit"
            styleVariant="primary"
            colorVariant="blue"
            size="l"
            text="완료"
            loading={isSubmitting}
            style={{ width: '100%' }}
          />
        </VStack>
      </form>
    </AuthCard>
  )
}
