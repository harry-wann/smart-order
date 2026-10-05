import { demoClient } from '@/services/client/demoClient'
import type { Category } from './types'

// GET /northwind/categories：分類清單
export async function fetchCategories(signal?: AbortSignal) {
  const { data } = await demoClient.get<Category[]>('/northwind/categories', { signal })
  return data
}
