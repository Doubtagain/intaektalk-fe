import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { AlphaIconButton, SmoothCornersBox, Spinner } from '@channel.io/bezier-react'
import { PlayFilledIcon, RefreshIcon } from '@channel.io/bezier-icons'

import type { MediaMeta } from '@/lib/api/types'
import { useUiStore, type AutoplayPolicy } from '@/stores/uiStore'

import { useInView } from './useInView'

const ANIMATED_IMAGE_TYPES = ['image/gif', 'image/webp', 'image/apng']
const MAX_MEDIA_WIDTH = 240
const FALLBACK_MEDIA_HEIGHT = 180

/** 자동 재생 허용 판정 — wifi-only 는 cellular 일 때만 불허(미지원 브라우저는 허용) */
function isAutoplayAllowed(policy: AutoplayPolicy): boolean {
  if (policy === 'always') return true
  if (policy === 'never') return false
  const connection = (navigator as Navigator & { connection?: { type?: string } }).connection
  return connection?.type !== 'cellular'
}

const fillStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }
const mediaStyle: CSSProperties = { ...fillStyle, objectFit: 'cover', display: 'block' }
const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/**
 * 미디어 메시지(§6.2) — 움짤은 뷰포트 진입 시 재생, 이탈 시 정지.
 * GIF/WebP/APNG 는 <img> src 스왑, 무음 mp4 는 <video> play/pause.
 * 자동 재생 불허 상태면 썸네일 + 중앙 재생 오버레이.
 */
export function MediaMessage({ media }: { media: MediaMeta }) {
  const autoplayPolicy = useUiStore((s) => s.autoplay)
  const [tapped, setTapped] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const { ref: viewRef, inView } = useInView<HTMLDivElement>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const isAnimatedImage = media.isAnimated && ANIMATED_IMAGE_TYPES.includes(media.mimeType)
  const isAnimatedVideo = media.isAnimated && media.mimeType === 'video/mp4'
  const canAutoplay = isAutoplayAllowed(autoplayPolicy) || tapped
  const needsTapToPlay = (isAnimatedImage || isAnimatedVideo) && !canAutoplay

  // 무음 mp4: 가시성에 따라 재생/정지
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView && canAutoplay) void video.play().catch(() => {})
    else video.pause()
  }, [inView, canAutoplay, retryNonce])

  const handleLoaded = () => setLoaded(true)
  const handleError = () => setFailedToLoad(true)
  const handleRetry = () => {
    setFailedToLoad(false)
    setLoaded(false)
    setRetryNonce((n) => n + 1)
  }

  // width/height 메타로 aspect-ratio 를 지정해 레이아웃 점프를 방지한다
  const aspectRatio =
    media.width && media.height ? `${media.width} / ${media.height}` : undefined
  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: media.width ? Math.min(media.width, MAX_MEDIA_WIDTH) : MAX_MEDIA_WIDTH,
    maxWidth: '100%',
    aspectRatio,
    height: aspectRatio ? undefined : FALLBACK_MEDIA_HEIGHT,
  }

  let content: ReactNode = null
  let hasSource = false

  if (failedToLoad) {
    content = (
      <div style={overlayStyle}>
        <AlphaIconButton
          content={RefreshIcon}
          aria-label="미디어 다시 불러오기"
          variant="secondary"
          color="dark-grey"
          size="s"
          onClick={handleRetry}
        />
      </div>
    )
  } else if (isAnimatedVideo) {
    if (canAutoplay) {
      hasSource = true
      content = (
        <video
          key={retryNonce}
          ref={videoRef}
          src={media.url}
          poster={media.thumbnailUrl ?? undefined}
          loop
          muted
          playsInline
          preload="metadata"
          style={mediaStyle}
          onLoadedData={handleLoaded}
          onError={handleError}
        />
      )
    } else if (media.thumbnailUrl) {
      hasSource = true
      content = (
        <img
          key={retryNonce}
          src={media.thumbnailUrl}
          alt="움짤 미리보기"
          style={mediaStyle}
          onLoad={handleLoaded}
          onError={handleError}
        />
      )
    }
  } else if (isAnimatedImage) {
    // 뷰포트 진입 시 원본(애니메이션), 이탈 시 썸네일(없으면 src 제거)로 정지
    const src = canAutoplay
      ? inView
        ? media.url
        : media.thumbnailUrl ?? undefined
      : media.thumbnailUrl ?? undefined
    if (src) {
      hasSource = true
      content = (
        <img
          key={retryNonce}
          src={src}
          alt="움짤"
          style={mediaStyle}
          onLoad={handleLoaded}
          onError={handleError}
        />
      )
    }
  } else {
    hasSource = true
    content = (
      <button
        type="button"
        aria-label="원본 이미지 보기"
        onClick={() => window.open(media.url, '_blank', 'noopener,noreferrer')}
        style={{ ...fillStyle, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
      >
        <img
          key={retryNonce}
          src={media.thumbnailUrl ?? media.url}
          alt="사진"
          style={mediaStyle}
          onLoad={handleLoaded}
          onError={handleError}
        />
      </button>
    )
  }

  return (
    <SmoothCornersBox borderRadius={12} backgroundColor="bg-black-lightest" style={containerStyle}>
      <div ref={viewRef} style={fillStyle}>
        {content}
        {needsTapToPlay && !failedToLoad && (
          <div style={{ ...overlayStyle, backgroundColor: 'var(--bg-black-light)' }}>
            <AlphaIconButton
              content={PlayFilledIcon}
              aria-label="재생"
              variant="primary"
              color="white-absolute"
              shape="circle"
              size="m"
              onClick={() => setTapped(true)}
            />
          </div>
        )}
        {hasSource && !loaded && !failedToLoad && (
          <div style={overlayStyle} aria-hidden>
            <Spinner size="s" color="txt-black-dark" />
          </div>
        )}
      </div>
    </SmoothCornersBox>
  )
}
