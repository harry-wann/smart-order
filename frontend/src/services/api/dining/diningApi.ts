import { customerClient } from '@/services/client/customerClient'

export type CurrentDining = {
  sessionId: number
  tableNo: string
}

// GET /dining/current：用 X-Session-Token 查目前這桌的用餐場次
export async function getCurrentDining() {
  const { data } = await customerClient.get<CurrentDining>('/dining/current')
  return data
}
