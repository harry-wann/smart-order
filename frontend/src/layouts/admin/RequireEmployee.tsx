import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { EMPLOYEE_LOGIN_PATH } from '@/services/client/employeeClient'
import { employeeToken } from '@/services/client/tokenStore'

export type Props = {
  children: ReactNode
}

// 店家端頁面（含候位叫號螢幕，它也要員工 token 才能訂閱推播）沒登入就先導到登入頁，不先露出後台畫面。
// 這裡只看這台裝置有沒有存員工 token，是體驗上的守門；token 過期、角色不夠還是由後端擋
// （後端回 401 時 employeeClient 會清掉 token 導回登入頁）
function RequireEmployee({ children }: Props) {
  if (!employeeToken.get()) return <Navigate to={EMPLOYEE_LOGIN_PATH} replace />
  return children
}

export default RequireEmployee
