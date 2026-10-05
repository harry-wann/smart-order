import { useState } from 'react'
import SOButton from '@/components/SOButton'
import useCategories from '@/hooks/northwind/useCategories'
import {
  useCreateProduct,
  useDeleteProduct,
  usePatchProduct,
  useUpdateProduct,
} from '@/hooks/northwind/useProductMutations'
import { useProduct, useProducts } from '@/hooks/northwind/useProductQueries'
import DemoLayout from '../DemoLayout'
import ProductDetail from './ProductDetail'
import ProductForm from './ProductForm'
import ProductTable from './ProductTable'

function TanStackRestDemo() {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const products = useProducts({ page, size: PAGE_SIZE })
  const selected = useProduct(selectedId)
  const categories = useCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const patch = usePatchProduct()
  const remove = useDeleteProduct()

  const totalPages = Math.max(1, Math.ceil((products.data?.totalElements ?? 0) / PAGE_SIZE))
  const actionError = patch.error ?? remove.error

  return (
    <DemoLayout
      title="Northwind：TanStack Query"
      description="資料交給 useQuery 管，寫入用 useMutation，成功後由 hook 讓快取過期自動重抓；上架切換是樂觀更新。對照純 Axios 版，頁面裡少了哪些程式碼。"
    >
      <ProductForm
        key={create.data?.id ?? 'create'}
        title="新增商品（POST）"
        submitText="新增"
        categories={categories.data ?? []}
        isSubmitting={create.isPending}
        errorMessage={create.error?.message}
        successMessage={create.data && `已新增「${create.data.productName}」（#${create.data.id}）`}
        onSubmit={(body) => create.mutate(body)}
      />

      <section className="rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="type-h2">商品清單（GET 分頁）</h2>
          <span className="type-caption text-ink-600">
            {products.isFetching ? '更新中…' : `共 ${products.data?.totalElements ?? 0} 筆`}
          </span>
        </div>
        {actionError && <p className="mt-3 type-body-sm text-danger">{actionError.message}</p>}

        {products.isPending ? (
          <p className="py-10 text-center type-body-sm text-ink-600">載入中…</p>
        ) : products.isError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="type-body-sm text-danger">{products.error.message}</p>
            <div className="w-32">
              <SOButton text="重試" height="h-11" variant="secondary" onClick={() => products.refetch()} />
            </div>
          </div>
        ) : (
          <ProductTable
            products={products.data.items}
            categories={categories.data ?? []}
            selectedId={selectedId}
            page={page}
            totalPages={totalPages}
            isPageChanging={products.isPlaceholderData}
            onSelect={(product) => setSelectedId(product.id)}
            onToggle={(product) => patch.mutate({ id: product.id, body: { discontinued: !product.discontinued } })}
            onDelete={(product) =>
              remove.mutate(product.id, {
                onSuccess: () => {
                  if (product.id === selectedId) setSelectedId(null)
                },
              })
            }
            onPageChange={setPage}
          />
        )}
      </section>

      <ProductDetail
        product={selectedId === null ? undefined : selected.data}
        isLoading={selected.isPending && selectedId !== null}
        loadError={selected.error?.message}
        categories={categories.data ?? []}
        isSubmitting={update.isPending}
        submitError={update.error?.message}
        onUpdate={(body) => selectedId !== null && update.mutate({ id: selectedId, body })}
      />
    </DemoLayout>
  )
}

export default TanStackRestDemo

const PAGE_SIZE = 10
