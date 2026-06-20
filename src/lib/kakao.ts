/** Kakao JavaScript SDK v2 로더 + 로그인(인가 코드 redirect 방식).
 * SDK v2 는 v1 의 Auth.login(팝업 + 토큰 콜백)을 제공하지 않는다 —
 * Auth.authorize() 로 카카오 인증 페이지로 이동했다가 redirectUri 로
 * ?code=<인가 코드> 를 받아 돌아오고, 코드 → 토큰 교환은 백엔드(/auth/kakao)가 수행한다. */

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
// 공식 배포 파일 기준 SRI 해시 (실제 파일 다운로드로 검증됨)
const KAKAO_SDK_INTEGRITY =
  'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka'

interface KakaoSdk {
  init: (appKey: string) => void
  isInitialized: () => boolean
  Auth: {
    authorize: (settings: { redirectUri: string; state?: string }) => void
    logout: (callback?: () => void) => void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

let loadPromise: Promise<KakaoSdk> | null = null

export function loadKakaoSdk(): Promise<KakaoSdk> {
  if (!loadPromise) {
    loadPromise = new Promise<KakaoSdk>((resolve, reject) => {
      const appKey = import.meta.env.VITE_KAKAO_JS_KEY
      if (!appKey) {
        reject(new Error('VITE_KAKAO_JS_KEY 가 설정되지 않았습니다. .env 를 확인하세요.'))
        return
      }
      if (window.Kakao?.isInitialized()) {
        resolve(window.Kakao)
        return
      }
      const script = document.createElement('script')
      script.src = KAKAO_SDK_URL
      script.integrity = KAKAO_SDK_INTEGRITY
      script.crossOrigin = 'anonymous'
      script.onload = () => {
        const kakao = window.Kakao
        if (!kakao) {
          reject(new Error('Kakao SDK 로드에 실패했습니다.'))
          return
        }
        if (!kakao.isInitialized()) kakao.init(appKey)
        resolve(kakao)
      }
      script.onerror = () => reject(new Error('Kakao SDK 스크립트를 불러오지 못했습니다.'))
      document.head.appendChild(script)
    })
    loadPromise.catch(() => {
      loadPromise = null
    })
  }
  return loadPromise
}

/** 카카오 인증 페이지로 이동한다 (현재 페이지를 떠난다).
 * 인증 후 redirectUri 로 ?code= 또는 ?error= 쿼리와 함께 돌아온다. */
export async function startKakaoLogin(redirectUri: string): Promise<void> {
  const kakao = await loadKakaoSdk()
  kakao.Auth.authorize({ redirectUri })
}
