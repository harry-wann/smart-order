import { useState, type FormEvent, type ReactNode } from 'react'
import SOButton from '@/components/SOButton'
import type { Category, ProductInput } from '@/services/api/northwind/types'

export type Props = {
  title: string
  submitText: string
  categories: Category[]
  initial?: ProductInput
  isSubmitting: boolean
  errorMessage?: string
  successMessage?: string
  onSubmit: (body: ProductInput) => void
}

function ProductForm({
  title,
  submitText,
  categories,
  initial,
  isSubmitting,
  errorMessage,
  successMessage,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(() => toFormState(initial))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({
      productName: form.productName,
      unitPrice: Number(form.unitPrice),
      unitsInStock: Number(form.unitsInStock),
      discontinued: form.discontinued,
      categoryId: Number(form.categoryId),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 className="type-h2">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="名稱">
          <input
            required
            value={form.productName}
            onChange={(event) => setForm({ ...form, productName: event.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="單價">
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.unitPrice}
            onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="庫存">
          <input
            required
            type="number"
            min="0"
            value={form.unitsInStock}
            onChange={(event) => setForm({ ...form, unitsInStock: event.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="分類">
          <select
            required
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            className={INPUT_CLASS}
          >
            <option value="">請選擇</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2 type-body-sm">
        <input
          type="checkbox"
          checked={form.discontinued}
          onChange={(event) => setForm({ ...form, discontinued: event.target.checked })}
          className="size-4 accent-brand-600"
        />
        已停售
      </label>

      <div className="mt-4 flex items-center gap-4">
        <div className="w-32">
          <SOButton
            type="submit"
            text={isSubmitting ? '送出中…' : submitText}
            height="h-11"
            disabled={isSubmitting}
          />
        </div>
        {errorMessage && <p className="type-body-sm text-danger">{errorMessage}</p>}
        {successMessage && <p className="type-body-sm text-success-ink">{successMessage}</p>}
      </div>
    </form>
  )
}

export default ProductForm

const INPUT_CLASS = 'h-11 w-full rounded-btn border border-line bg-surface px-3 type-body focus:border-brand-600 focus:outline-none'

function toFormState(product?: ProductInput) {
  return {
    productName: product?.productName ?? '',
    unitPrice: product ? String(product.unitPrice) : '',
    unitsInStock: product ? String(product.unitsInStock) : '',
    categoryId: product ? String(product.categoryId) : '',
    discontinued: product?.discontinued ?? false,
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="type-caption text-ink-600">{label}</span>
      {children}
    </label>
  )
}
