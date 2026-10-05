export type Product = {
  id: number
  productName: string
  unitPrice: number
  unitsInStock: number
  discontinued: boolean
  categoryId: number
}

export type ProductPage = {
  items: Product[]
  page: number
  size: number
  totalElements: number
}

export type ProductPageParams = {
  page: number
  size: number
}

export type ProductInput = Omit<Product, 'id'>

export type ProductPatch = Partial<ProductInput>

export type Category = {
  id: number
  name: string
}
