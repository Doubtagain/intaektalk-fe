import createClient from 'openapi-fetch'

import { getAuthState } from '@/stores/authStore'

import type { paths } from './schema'
import type { ApiErrorBody, AuthTokens } from './types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

/** OpenAPI 경로는 `/api/v1/...` 를 포함하므로 baseUrl 은 origin 만 (프리픽스 미포함) */
export const API_PREFIX = '/api/v1'

export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details: unknown

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.statusCode = body.statusCode ?? 0
    this.code = body.code
    this.details = body.details
  }

  /** openapi-fetch 의 error/응답에서 ApiError 생성 */
  static from(error: unknown, status: number): ApiError {
    if (error && typeof error === 'object' && 'code' in error) {
      const e = error as ApiErrorBody
      return new ApiError({ code: e.code, message: e.message, statusCode: status, details: e.details })
    }
    return new ApiError({ code: 'UNKNOWN', message: '요청을 처리하지 못했습니다.', statusCode: status })
  }
}

// ---------- 401 단일 비행(single-flight) 리프레시 ----------

let refreshPromise: Promise<boolean> | null = null

export async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refreshToken, setTokens, clear } = getAuthState()
      if (!refreshToken) return false
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) {
          clear()
          return false
        }
        const tokens = (await res.json()) as AuthTokens
        setTokens(tokens)
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

/**
 * Bearer 토큰을 주입하고 401 시 1회 리프레시 후 재시도하는 fetch.
 * 본문 소비 전에 clone 을 떠 두어 재시도 시 동일 요청을 재전송한다.
 */
async function authFetch(request: Request): Promise<Response> {
  const token = getAuthState().accessToken
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  const retry = request.clone()

  const res = await fetch(request)
  if (res.status !== 401) return res

  const refreshed = await refreshTokens()
  if (!refreshed) return res

  const newToken = getAuthState().accessToken
  if (newToken) retry.headers.set('Authorization', `Bearer ${newToken}`)
  return fetch(retry)
}

/** 타입 안전 OpenAPI 클라이언트 (요청 바디/경로/파라미터는 생성 타입으로 검증) */
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authFetch,
})

type FetchResult = { data?: unknown; error?: unknown; response: Response }

/**
 * openapi-fetch 결과를 throw 기반 계약으로 변환.
 * 성공 시 data 를 호출부 지정 타입으로 반환, 에러 시 ApiError throw.
 * (백엔드가 응답을 타입화하지 않으므로 data 는 호출부에서 단언한다.)
 */
export function unwrap<T>(result: FetchResult): T {
  if (result.error !== undefined && result.error !== null) {
    throw ApiError.from(result.error, result.response.status)
  }
  return result.data as unknown as T
}

/** 인증 헤더 없이 보내는 공개 POST (생성 DTO 와 일시적으로 어긋나는 엔드포인트용 — 예: /auth/kakao) */
export async function rawPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let parsed: unknown = undefined
  if (res.status !== 204) {
    try {
      parsed = await res.json()
    } catch {
      parsed = undefined
    }
  }
  if (!res.ok) throw ApiError.from(parsed, res.status)
  return parsed as T
}
