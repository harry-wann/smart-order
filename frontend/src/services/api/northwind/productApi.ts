import { demoClient } from '@/services/client/demoClient'
import type { Product, ProductInput, ProductPage, ProductPageParams, ProductPatch } from './types'

const PRODUCTS = '/northwind/products'

// GET /northwind/products?page=0&size=10&sort=id：查清單（分頁）
export async function fetchProducts({ page, size }: ProductPageParams, signal?: AbortSignal) {
  const { data } = await demoClient.get<ProductPage>(PRODUCTS, {
    params: { page, size, sort: 'id' },
    signal,
  })
  return data
}

// GET /northwind/products/{id}：查一筆
export async function fetchProduct(id: number, signal?: AbortSignal) {
  const { data } = await demoClient.get<Product>(`${PRODUCTS}/${id}`, { signal })
  return data
}

// POST /northwind/products：新增，回 201 和新商品
export async function createProduct(body: ProductInput) {
  const { data } = await demoClient.post<Product>(PRODUCTS, body)
  return data
}

// PUT /northwind/products/{id}：整筆取代，所有欄位都要給
export async function updateProduct(id: number, body: ProductInput) {
  const { data } = await demoClient.put<Product>(`${PRODUCTS}/${id}`, body)
  return data
}

// PATCH /northwind/products/{id}：只改有給的欄位
export async function patchProduct(id: number, body: ProductPatch) {
  const { data } = await demoClient.patch<Product>(`${PRODUCTS}/${id}`, body)
  return data
}

// DELETE /northwind/products/{id}：刪除，回 204
export async function deleteProduct(id: number) {
  await demoClient.delete(`${PRODUCTS}/${id}`)
}
