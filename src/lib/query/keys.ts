/** TanStack Query 키 팩토리 — WS 이벤트 핸들러와 화면이 공유하는 단일 출처 */
export const queryKeys = {
  rooms: ['rooms'] as const,
  room: (roomId: string) => ['rooms', roomId] as const,
  messages: (roomId: string) => ['rooms', roomId, 'messages'] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
  media: (mediaId: string) => ['media', mediaId] as const,
  profile: ['profile'] as const,
}
