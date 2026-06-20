import {
  Button,
  Center,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  TextArea,
  TextField,
  VStack,
  useToast,
} from '@channel.io/bezier-react'
import { Controller, useForm } from 'react-hook-form'

import { AvatarUploader } from '@/components/AvatarUploader'
import { profileApi } from '@/lib/api/endpoints'
import { useAuthStore } from '@/stores/authStore'

interface ProfileFormValues {
  nickname: string
  statusMessage: string
  /** 새로 업로드한 아바타 미디어 id. null = 변경 없음 */
  avatarMediaId: string | null
}

const STATUS_MESSAGE_MAX = 80

/** 설정 §프로필 — 아바타/닉네임/상태메시지 편집 → PATCH /profile */
export function ProfileSection() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useToast()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    mode: 'onChange',
    defaultValues: {
      nickname: user?.nickname ?? '',
      statusMessage: user?.statusMessage ?? '',
      avatarMediaId: null,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const status = values.statusMessage.trim()
      const updated = await profileApi.update({
        nickname: values.nickname.trim(),
        statusMessage: status,
        ...(values.avatarMediaId ? { avatarMediaId: values.avatarMediaId } : {}),
      })
      // ProfileResponse 매핑본은 isAdmin/kakaoId 가 없으므로 기존 user 와 병합해 보존한다.
      const current = useAuthStore.getState().user
      setUser(current ? { ...current, ...updated } : updated)
      reset({
        nickname: updated.nickname,
        statusMessage: updated.statusMessage ?? '',
        avatarMediaId: null,
      })
      toast.addToast('저장했어요', { preset: 'success' })
    } catch {
      toast.addToast('저장하지 못했어요', { preset: 'error' })
    }
  })

  return (
    <VStack as="form" align="stretch" spacing={16} onSubmit={(e) => void onSubmit(e)}>
      <Center>
        <AvatarUploader
          name={user?.nickname ?? '프로필'}
          value={user?.avatarUrl ?? null}
          onChange={(mediaId) => setValue('avatarMediaId', mediaId, { shouldDirty: true })}
          disabled={isSubmitting}
        />
      </Center>

      <Controller
        name="nickname"
        control={control}
        rules={{
          required: '닉네임을 입력해 주세요.',
          validate: (value) => {
            const length = value.trim().length
            return (length >= 2 && length <= 20) || '닉네임은 2~20자로 입력해 주세요.'
          },
        }}
        render={({ field }) => (
          <FormControl hasError={!!errors.nickname} required disabled={isSubmitting}>
            <FormLabel>닉네임</FormLabel>
            <TextField
              size="m"
              allowClear
              placeholder="닉네임"
              maxLength={20}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            {errors.nickname ? (
              <FormErrorMessage>{errors.nickname.message}</FormErrorMessage>
            ) : (
              <FormHelperText>2~20자로 입력합니다.</FormHelperText>
            )}
          </FormControl>
        )}
      />

      <Controller
        name="statusMessage"
        control={control}
        rules={{
          maxLength: {
            value: STATUS_MESSAGE_MAX,
            message: `상태메시지는 최대 ${STATUS_MESSAGE_MAX}자입니다.`,
          },
        }}
        render={({ field }) => (
          <FormControl hasError={!!errors.statusMessage} disabled={isSubmitting}>
            <FormLabel>상태메시지</FormLabel>
            <TextArea
              minRows={3}
              maxRows={6}
              placeholder="상태메시지"
              maxLength={STATUS_MESSAGE_MAX}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            {errors.statusMessage ? (
              <FormErrorMessage>{errors.statusMessage.message}</FormErrorMessage>
            ) : (
              <FormHelperText>최대 {STATUS_MESSAGE_MAX}자까지 적을 수 있습니다.</FormHelperText>
            )}
          </FormControl>
        )}
      />

      <HStack justify="end">
        <Button
          type="submit"
          styleVariant="primary"
          colorVariant="blue"
          size="m"
          text="저장"
          disabled={!isDirty}
          loading={isSubmitting}
        />
      </HStack>
    </VStack>
  )
}
