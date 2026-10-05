import SOButton from '@/components/SOButton'
import type { Category, Product } from '@/services/api/northwind/types'

export type Props = {
  products: Product[]
  categories: Category[]
  selectedId: number | null
  page: number
  totalPages: number
  isPageChanging: boolean
  onSelect: (product: Product) => void
  onToggle: (product: Product) => void
  onDelete: (product: Product) => void
  onPageChange: (page: number) => void
}

function ProductTable({
  products,
  categories,
  selectedId,
  page,
  totalPages,
  isPageChanging,
  onSelect,
  onToggle,
  onDelete,
  onPageChange,
}: Props) {
  const categoryName = (id: number) => categories.find((category) => category.id === id)?.name ?? id

  return (
    <>
      {products.length === 0 ? (
        <p className="py-10 text-center type-body-sm text-ink-600">這一頁沒有商品</p>
      ) : (
        <table className="mt-4 w-full text-left type-body-sm">
          <thead className="text-ink-600">
            <tr className="border-b border-line">
              <th className="py-2">ID</th>
              <th className="py-2">名稱</th>
              <th className="py-2">分類</th>
              <th className="py-2 text-right">單價</th>
              <th className="py-2 text-right">庫存</th>
              <th className="py-2 text-center">上架</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                onClick={() => onSelect(product)}
                className={`cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2 ${
                  product.id === selectedId ? 'bg-brand-100' : ''
                }`}
              >
                <td className="py-2 tabular-nums">{product.id}</td>
                <td className="py-2 font-bold">{product.productName}</td>
                <td className="py-2">{categoryName(product.categoryId)}</td>
                <td className="py-2 text-right tabular-nums">{product.unitPrice}</td>
                <td className="py-2 text-right tabular-nums">{product.unitsInStock}</td>
                <td className="py-2 text-center" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!product.discontinued}
                    onChange={() => onToggle(product)}
                    className="size-4 accent-brand-600"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(product)
                    }}
                    className="text-danger hover:underline"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <div className="w-28">
          <SOButton
            text="上一頁"
            height="h-11"
            variant="secondary"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          />
        </div>
        <span className="type-body-sm text-ink-600 tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <div className="w-28">
          <SOButton
            text="下一頁"
            height="h-11"
            variant="secondary"
            disabled={page + 1 >= totalPages || isPageChanging}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </div>
    </>
  )
}

export default ProductTable
