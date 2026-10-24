import { customerClient } from '@/services/client/customerClient'

export type OrderTicketItem = {
  id: number | string
  name: string
  quantity: number
  status: string
  options: string[]
  note?: string | null
}

export type OrderTicket = {
  sequenceNo: number
  items: OrderTicketItem[]
}

// 取得指定訂單
export async function getOrderTicket(orderTicketId: string) {
  const { data } = await customerClient.get<OrderTicket>(
    `/order-tickets/${orderTicketId}`,
  )
  return data
}

export type AddMenuItemToCartRequest = {
  sessionId: number | string
  menuItemId: number
  quantity: number
  optionValueIds: number[]
  note?: string
}

// 把品項加進整桌購物車。品項詳情頁的「加入購物車」和菜單上的 [+] 快速加入共用這一支。
// 失敗時丟出 ApiError，message 就是後端給顧客看的原因
// （例如 409「商品已下架或售完」、「桌次已關閉，無法新增購物車品項」；分類被停用也算下架）
export async function addMenuItemToCart(request: AddMenuItemToCartRequest) {
  await customerClient.post('/order/cart/items', request)
}
