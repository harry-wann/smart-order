import type { Category, Product, ProductInput } from '@/services/api/northwind/types'
import ProductForm from './ProductForm'

export type Props = {
  product?: Product
  isLoading: boolean
  loadError?: string
  categories: Category[]
  isSubmitting: boolean
  submitError?: string
  onUpdate: (body: ProductInput) => void
}

function ProductDetail({ product, isLoading, loadError, categories, isSubmitting, submitError, onUpdate }: Props) {
  if (isLoading) return <Panel>載入中…</Panel>
  if (loadError) return <Panel>{loadError}</Panel>
  if (!product) return <Panel>點清單裡的一列，這裡會用 GET 查一筆，並可以用 PUT 整筆修改。</Panel>

  return (
    <ProductForm
      key={JSON.stringify(product)}
      title={`修改 #${product.id}（PUT 整筆取代）`}
      submitText="儲存"
      categories={categories}
      initial={product}
      isSubmitting={isSubmitting}
      errorMessage={submitError}
      onSubmit={onUpdate}
    />
  )
}

export default ProductDetail

function Panel({ children }: { children: string }) {
  return (
    <section className="rounded-card border border-dashed border-line bg-surface-2 p-6 type-body-sm text-ink-600">
      {children}
    </section>
  )
}
