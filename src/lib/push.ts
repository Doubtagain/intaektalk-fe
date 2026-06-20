/** 푸시 알림 — 백엔드는 **FCM 토큰**을 받는다(POST /api/v1/push/tokens { fcmToken, platform }).
 *
 * FCM 토큰 발급에는 Firebase 프로젝트 + Firebase JS SDK(firebase/messaging) 설정이 필요하다(현재 미구성).
 * Firebase 설정이 들어오면:
 *   1) firebase/messaging 의 getToken({ vapidKey }) 으로 fcmToken 획득
 *   2) registerPush 에서 pushApi.register({ fcmToken, platform: 'web', deviceId }) 호출
 *   3) unregisterPush 에서 pushApi.remove(tokenId) 호출
 * 그 전까지는 'unsupported' 로 동작해 알림 토글이 안전하게 비활성처럼 보인다.
 *
 * 계약(시그니처)은 설정 화면(NotificationSection)이 의존하므로 변경하지 않는다.
 */

export type PushPermission = 'granted' | 'denied' | 'unsupported'
export type PushStatus = 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'

/** Firebase 설정이 완료되면 true 로 전환 */
const FCM_CONFIGURED = false

/** 알림 권한 요청 + FCM 토큰 발급 + 백엔드 등록 */
export async function registerPush(): Promise<PushPermission> {
  if (!FCM_CONFIGURED) return 'unsupported'
  // TODO(FCM): Firebase getToken → pushApi.register({ fcmToken, platform: 'web', deviceId })
  return 'unsupported'
}

/** 현재 구독 상태 조회 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!FCM_CONFIGURED) return 'unsupported'
  return 'unsupported'
}

/** 구독 해지 + 백엔드 등록 해제 */
export async function unregisterPush(): Promise<void> {
  // TODO(FCM): pushApi.remove(tokenId)
}
