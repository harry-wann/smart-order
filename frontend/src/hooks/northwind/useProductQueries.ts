import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchProduct, fetchProducts } from '@/services/api/northwind/productApi'
import type { ProductPageParams } from '@/services/api/northwind/types'
import { northwindKeys } from './northwindKeys'

// GET 清單：page 放進 queryKey，換頁時先留著上一頁避免畫面閃回載入中
export function useProducts(params: ProductPageParams) {
  return useQuery({
    queryKey: northwindKeys.products(params),
    queryFn: ({ signal }) => fetchProducts(params, signal),
    placeholderData: keepPreviousData,
  })
}

// GET 一筆：還沒選商品（id 是 null）時不打 API
export function useProduct(id: number | null) {
  return useQuery({
    queryKey: northwindKeys.product(id ?? 0),
    queryFn: ({ signal }) => fetchProduct(id ?? 0, signal),
    enabled: id !== null,
  })
}
