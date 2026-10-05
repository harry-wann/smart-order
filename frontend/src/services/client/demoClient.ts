import { createApiClient } from './createApiClient'

// Northwind 是公開的練習資料，不屬於顧客也不屬於員工，所以不帶任何 token
export const demoClient = createApiClient()
