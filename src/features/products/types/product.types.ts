import type { z } from 'zod'

import type { productFormSchema, productSchema } from '../schemas/product.schema'

/**
 * Tipos da feature de produtos.
 *
 * Os tipos ligados a dados são INFERIDOS dos esquemas Zod, nunca escritos à mão.
 * Duplicar um `interface Product` ao lado do esquema garante que, algum dia, os
 * dois vão divergir em silêncio.
 */

export type Product = z.infer<typeof productSchema>
export type ProductFormValues = z.infer<typeof productFormSchema>

/**
 * Ordenações que a UI oferece.
 *
 * União de literais em vez de duas strings livres (campo + direção): assim só
 * existem combinações válidas, e o `<select>` pode usar o valor direto.
 */
export type ProductSort = 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc'

/**
 * Consulta à listagem, do ponto de vista da APLICAÇÃO.
 *
 * Repare que falamos em `page` (1, 2, 3...), enquanto a API fala em `skip`
 * (quantos itens pular). A conversão fica no service: a UI raciocina em páginas,
 * que é o que o usuário vê.
 */
export interface ProductQuery {
  page: number
  pageSize: number
  /** Busca textual. Vazio significa "sem busca". */
  search: string
  /** Slug da categoria. Vazio significa "todas". */
  category: string
  sort: ProductSort
}

/** Resultado da listagem já traduzido para o vocabulário da aplicação. */
export interface ProductListResult {
  products: Product[]
  /** Total de itens no servidor — usado para calcular o número de páginas. */
  total: number
}
