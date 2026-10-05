import type { ProductPageParams } from '@/services/api/northwind/types'
import { queryScope } from '@/services/client/queryClient'

export const northwindKeys = {
  all: [...queryScope.demo, 'northwind'] as const,
  productLists: () => [...northwindKeys.all, 'products'] as const,
  products: (params: ProductPageParams) => [...northwindKeys.productLists(), params] as const,
  product: (id: number) => [...northwindKeys.all, 'product', id] as const,
  categories: () => [...northwindKeys.all, 'categories'] as const,
}
