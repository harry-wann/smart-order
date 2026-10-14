import { signInMember } from './auth'

// 會員登入（工作包 A）完成前的替身：後端 MemberIdentityResolver 只認 mock-member-{id}。
// 換成真的驗證碼登入時，改存後端回的 JWT，再把這個檔案刪掉。
const MOCK_MEMBER_ID = 1 // 假資料的陳小美 0912345678

export function signInMockMember() {
  signInMember(`mock-member-${MOCK_MEMBER_ID}`)
}
