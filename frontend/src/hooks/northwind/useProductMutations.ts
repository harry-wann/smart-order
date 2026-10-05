import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  patchProduct,
  updateProduct,
} from '@/services/api/northwind/productApi'
import type { ProductInput, ProductPage, ProductPatch } from '@/services/api/northwind/types'
import { northwindKeys } from './northwindKeys'

// POST：成功後讓所有分頁的清單過期，畫面上的那一頁會自動重抓
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() }),
  })
}

// PUT：後端回的就是最新的一筆，直接寫進單筆快取，清單則重抓
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductInput }) => updateProduct(id, body),
    onSuccess: (product) => {
      queryClient.setQueryData(northwindKeys.product(product.id), product)
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}

// PATCH：樂觀更新，畫面先變；失敗就還原，最後不管成功失敗都重抓
export function usePatchProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductPatch }) => patchProduct(id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: northwindKeys.productLists() })
      const snapshots = queryClient.getQueriesData<ProductPage>({ queryKey: northwindKeys.productLists() })

      queryClient.setQueriesData<ProductPage>({ queryKey: northwindKeys.productLists() }, (page) =>
        page && {
          ...page,
          items: page.items.map((product) => (product.id === id ? { ...product, ...body } : product)),
        },
      )

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, page]) => queryClient.setQueryData(queryKey, page))
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: northwindKeys.product(id) })
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}

// DELETE：移除單筆快取，清單重抓
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: northwindKeys.product(id) })
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}
