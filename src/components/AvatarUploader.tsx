import { useEffect, useRef, useState } from 'react'

import { Avatar, Spinner, Text, type AvatarSize } from '@channel.io/bezier-react'

import { mediaApi } from '@/lib/api/endpoints'

interface AvatarUploaderProps {
  /** Avatar 의 시맨틱 이름 (닉네임 등) */
  name: string
  /** 현재 표시할 아바타 URL (기존 값). 업로드 전 미리보기는 내부에서 관리 */
  value: string | null
  /** 업로드 완료 시 새 미디어 id 를 전달 (백엔드는 avatarMediaId 로 받는다) */
  onChange: (mediaId: string) => void
  size?: AvatarSize
  disabled?: boolean
}

/**
 * 아바타 업로더 — 클릭 → 이미지 선택 → presigned 업로드 → complete 확정 → mediaId 콜백.
 * 표시는 업로드 직후 서버 URL 로 갱신한다. 온보딩 / 설정 / 그룹 방 아바타가 공유한다.
 */
export function AvatarUploader({
  name,
  value,
  onChange,
  size = '72',
  disabled = false,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 업로드 중 즉시 미리보기용 ObjectURL */
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  /** 업로드 완료 후 서버 URL */
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const handleSelect = async (file: File) => {
    setUploading(true)
    setError(null)
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    try {
      const { mediaId, uploadUrl } = await mediaApi.createUploadUrl({
        mimeType: file.type,
        byteSize: file.size,
      })
      await mediaApi.uploadFile(uploadUrl, file)
      await mediaApi.complete(mediaId)
      const meta = await mediaApi.meta(mediaId)
      setUploadedUrl(meta.url)
      onChange(mediaId)
    } catch {
      setError('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = uploadedUrl ?? localPreview ?? value

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        aria-label="프로필 사진 변경"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'relative',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 'var(--opacity-disabled)' : undefined,
        }}
      >
        <Avatar name={name} avatarUrl={displayUrl ?? undefined} size={size} />
        {uploading && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner size="s" color="bgtxt-absolute-white-normal" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleSelect(file)
          e.target.value = ''
        }}
      />
      {error && (
        <Text typo="12" color="bgtxt-red-normal" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}
