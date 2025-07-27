export interface SearchChatInput {
  userId: string; // 사용자 ID
  cursor?: string; // 커서 위치
  size?: number; // 페이지 크기
  username?: string; // 검색할 사용자 이름
}
