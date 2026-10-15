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
