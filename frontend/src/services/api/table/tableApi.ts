import { employeeClient } from '@/services/client/employeeClient'

export type TableOrderItem = {
  id: number | string
  name: string
  quantity: number
  status: string
  note?: string | null
}

export type TableOrder = {
  id: number | string
  sequenceNo: number
  status: string
  time: string
  total: number | string
  items: TableOrderItem[]
}

export type TableDetail = {
  tableInfo: string
  diningStatus: string
  seatedTime: string
  diningMinutes: number
  orders: TableOrder[]
  subtotal: number | string
  serviceFee: number | string
  total: number | string
  adultCount: number
  childCount: number
}

// 取得桌位詳細資料
export async function getTableDetail(tableNumber: string) {
  const { data } = await employeeClient.get<TableDetail>(
    `/tables/${encodeURIComponent(tableNumber)}/detail`,
  )
  return data
}

// 模擬結帳
export async function checkoutTable(
  tableNumber: string,
  paymentMethod: string,
) {
  const methodMap: Record<string, string> = {
    cash: 'CASH',
    credit: 'CARD',
    barcode: 'BARCODE',
  }

  const method = methodMap[paymentMethod]

  if (!method) {
    throw new Error('不支援的付款方式')
  }

  const { data } = await employeeClient.post<unknown>(
    `/tables/${encodeURIComponent(tableNumber)}/checkout`,
    { paymentMethod: method },
  )
  return data
}
