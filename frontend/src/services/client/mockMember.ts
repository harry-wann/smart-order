import { signInMember } from './auth'

// 會員登入（工作包 A）完成前的替身：後端 MemberIdentityResolver 只認 mock-member-{id}，
// 而且後端要在 .env 設 MEMBER_MOCK_ENABLED=true 才收。正式建置不存 mock 權杖。
// 換成真的驗證碼登入時，改存後端回的 JWT，再把這個檔案刪掉。
const MOCK_MEMBER_ID = 1 // 假資料的陳小美 0912345678

export function signInMockMember() {
  if (!import.meta.env.DEV) return
  signInMember(`mock-member-${MOCK_MEMBER_ID}`)
}
