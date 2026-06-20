import { useEffect, useRef, useState } from 'react'

import { useToast } from '@channel.io/bezier-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { startKakaoLogin } from '@/lib/kakao'
import { useAuthStore } from '@/stores/authStore'

/**
 * 로그인 화면의 에러 분기.
 * - not-allowed: 403 NOT_ALLOWED (미등록 사용자) → red Banner
 * - sdk: VITE_KAKAO_JS_KEY 미설정 / SDK 로드 실패 / 카카오 측 오류 → orange Banner
 * - 기타 API 에러는 toast (preset 'error') 로 알린다.
 */
export type LoginErrorKind = 'not-allowed' | 'sdk' | null

/** authorize() 호출과 백엔드 코드 교환이 동일한 값을 써야 한다 */
const getRedirectUri = () => `${window.location.origin}/login`

/**
 * 카카오 로그인 (JS SDK v2 인가 코드 방식).
 * 1) login() → Auth.authorize() 로 카카오 인증 페이지로 이동 (페이지를 떠난다)
 * 2) /login?code= 으로 복귀 → 인가 코드를 POST /auth/kakao 로 교환 → setAuth
 *    (성공 시 PublicOnly 가드가 / 또는 /onboarding 으로 자동 이동시킨다)
 */
export function useKakaoLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 인가 코드를 들고 돌아온 직후라면 처음부터 로딩 상태로 시작한다
  const [loading, setLoading] = useState(() => searchParams.has('code'))
  const [errorKind, setErrorKind] = useState<LoginErrorKind>(null)
  // 인가 코드는 1회용 — StrictMode 이중 마운트/리렌더에서 재사용을 막는다
  const consumedRef = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const kakaoError = searchParams.get('error')
    if ((!code && !kakaoError) || consumedRef.current) return
    consumedRef.current = true

    // 쿼리를 즉시 비워 뒤로가기/새로고침 시 코드 재사용을 방지한다
    navigate('/login', { replace: true })

    if (kakaoError) {
      // access_denied = 사용자가 동의 화면에서 취소 — 배너 없이 조용히 복귀
      if (kakaoError !== 'access_denied') setErrorKind('sdk')
      setLoading(false)
      return
    }

    void (async () => {
      setLoading(true)
      try {
        const res = await authApi.loginWithKakao(code!, getRedirectUri())
        setAuth(res, res.user)
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NOT_ALLOWED') {
          setErrorKind('not-allowed')
        } else {
          addToast('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.', { preset: 'error' })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [searchParams, navigate, setAuth, addToast])

  const login = async () => {
    if (loading) return
    setErrorKind(null)
    setLoading(true)
    try {
      // 성공하면 전체 페이지가 카카오로 이동하므로 이후 코드는 실행되지 않는다
      await startKakaoLogin(getRedirectUri())
    } catch {
      setErrorKind('sdk')
      setLoading(false)
    }
  }

  return { login, loading, errorKind }
}
