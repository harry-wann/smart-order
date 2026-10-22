import { customerClient } from '@/services/client/customerClient'

export async function addCartItem(sessionId: string, item: {
  menuItemId: number; quantity: number; optionValueIds: number[]; note?: string;
}) {
  await customerClient.post(`/dining-sessions/${sessionId}/cart/items`, item)
}

export type CartItem = {
  id: number | string
  name: string
  people: string
  price: number | string
  quantity: number
  options?: string[]
  note?: string | null
  canEdit: boolean
  isOwnItem?: boolean
}

export type Cart = {
  cartVersion?: number | string | null
  items?: CartItem[]
  locked?: boolean
  tableNumber?: string
}

export type SubmitOrderResult = {
  orderTicketId?: number | string
  id?: number | string
}

// 取得整桌購物車
export async function getCart(sessionId: string) {
  const { data } = await customerClient.get<Cart>(
    `/dining-sessions/${sessionId}/cart`,
  )
  return data
}

// 修改自己加入的商品數量
export async function updateCartQuantity(
  sessionId: string,
  itemId: number | string,
  quantity: number,
) {
  const { data } = await customerClient.patch<unknown>(
    `/dining-sessions/${sessionId}/cart/items/${itemId}`,
    { quantity },
  )
  return data
}

// 刪除自己加入的商品
export async function deleteCartItem(
  sessionId: string,
  itemId: number | string,
) {
  const { data } = await customerClient.delete<unknown>(
    `/dining-sessions/${sessionId}/cart/items/${itemId}`,
  )
  return data
}

// 送出目前登入客人的餐點
export async function submitOrder(sessionId: string) {
  const { data } = await customerClient.post<SubmitOrderResult>(
    `/dining-sessions/${sessionId}/orders`,
  )
  return data
}
