import { useEffect, useState } from 'react'
import SOButton from '@/components/SOButton'
import { fetchCategories } from '@/services/api/northwind/categoryApi'
import {
  createProduct,
  deleteProduct,
  fetchProduct,
  fetchProducts,
  patchProduct,
  updateProduct,
} from '@/services/api/northwind/productApi'
import type { Category, Product, ProductInput, ProductPage } from '@/services/api/northwind/types'
import { isApiError } from '@/services/client/ApiError'
import DemoLayout from '../DemoLayout'
import ProductDetail from './ProductDetail'
import ProductForm from './ProductForm'
import ProductTable from './ProductTable'

function AxiosRestDemo() {
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [list, setList] = useState<ProductPage | null>(null)
  const [isListLoading, setIsListLoading] = useState(true)
  const [listError, setListError] = useState<string>()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Product>()
  const [isSelectedLoading, setIsSelectedLoading] = useState(false)
  const [selectedError, setSelectedError] = useState<string>()
  const [submitting, setSubmitting] = useState<'create' | 'update' | null>(null)
  const [createResult, setCreateResult] = useState<{ ok: boolean; message: string }>()
  const [updateError, setUpdateError] = useState<string>()
  const [actionError, setActionError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setIsListLoading(true)
    setListError(undefined)

    fetchProducts({ page, size: PAGE_SIZE }, controller.signal)
      .then(setList)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError(messageOf(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsListLoading(false)
      })

    return () => controller.abort()
  }, [page, reloadKey])

  useEffect(() => {
    if (selectedId === null) return
    const controller = new AbortController()
    setIsSelectedLoading(true)
    setSelectedError(undefined)

    fetchProduct(selectedId, controller.signal)
      .then(setSelected)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSelectedError(messageOf(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSelectedLoading(false)
      })

    return () => controller.abort()
  }, [selectedId, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  async function handleCreate(body: ProductInput) {
    setSubmitting('create')
    try {
      const product = await createProduct(body)
      setCreateResult({ ok: true, message: `已新增「${product.productName}」（#${product.id}）` })
      reload()
    } catch (error) {
      setCreateResult({ ok: false, message: messageOf(error) })
    } finally {
      setSubmitting(null)
    }
  }

  async function handleUpdate(body: ProductInput) {
    if (selectedId === null) return
    setSubmitting('update')
    setUpdateError(undefined)
    try {
      setSelected(await updateProduct(selectedId, body))
      reload()
    } catch (error) {
      setUpdateError(messageOf(error))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleToggle(product: Product) {
    setActionError(undefined)
    try {
      await patchProduct(product.id, { discontinued: !product.discontinued })
      reload()
    } catch (error) {
      setActionError(messageOf(error))
    }
  }

  async function handleDelete(product: Product) {
    setActionError(undefined)
    try {
      await deleteProduct(product.id)
      if (product.id === selectedId) {
        setSelectedId(null)
        setSelected(undefined)
      }
      reload()
    } catch (error) {
      setActionError(messageOf(error))
    }
  }

  const totalPages = Math.max(1, Math.ceil((list?.totalElements ?? 0) / PAGE_SIZE))

  return (
    <DemoLayout
      title="Northwind：純 Axios"
      description="資料用 useState 存、用 useEffect 抓，每個操作完成後自己呼叫 reload() 重抓。對照 TanStack Query 版，看看哪些事情要自己做。"
    >
      <ProductForm
        key={createResult?.ok ? createResult.message : 'create'}
        title="新增商品（POST）"
        submitText="新增"
        categories={categories}
        isSubmitting={submitting === 'create'}
        errorMessage={createResult?.ok === false ? createResult.message : undefined}
        successMessage={createResult?.ok ? createResult.message : undefined}
        onSubmit={handleCreate}
      />

      <section className="rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="type-h2">商品清單（GET 分頁）</h2>
          <span className="type-caption text-ink-600">
            {isListLoading ? '載入中…' : `共 ${list?.totalElements ?? 0} 筆`}
          </span>
        </div>
        {actionError && <p className="mt-3 type-body-sm text-danger">{actionError}</p>}

        {listError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="type-body-sm text-danger">{listError}</p>
            <div className="w-32">
              <SOButton text="重試" height="h-11" variant="secondary" onClick={reload} />
            </div>
          </div>
        ) : list ? (
          <ProductTable
            products={list.items}
            categories={categories}
            selectedId={selectedId}
            page={page}
            totalPages={totalPages}
            isPageChanging={isListLoading}
            onSelect={(product) => setSelectedId(product.id)}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onPageChange={setPage}
          />
        ) : (
          <p className="py-10 text-center type-body-sm text-ink-600">載入中…</p>
        )}
      </section>

      <ProductDetail
        product={selected}
        isLoading={isSelectedLoading}
        loadError={selectedError}
        categories={categories}
        isSubmitting={submitting === 'update'}
        submitError={updateError}
        onUpdate={handleUpdate}
      />
    </DemoLayout>
  )
}

export default AxiosRestDemo

const PAGE_SIZE = 10

function messageOf(error: unknown) {
  return isApiError(error) ? error.message : '發生錯誤，請稍後再試'
}
