import { http } from '@/lib/http/client'

import {
  categoryListSchema,
  productListResponseSchema,
  productSchema,
  productWriteResponseSchema,
} from '../schemas/product.schema'
import type {
  Product,
  ProductFormValues,
  ProductListResult,
  ProductQuery,
  ProductSort,
} from '../types/product.types'

/**
 * Acesso à API de produtos.
 *
 * O QUE UM SERVICE FAZ: fala HTTP e traduz entre o formato da API e o formato
 * da aplicação. É a única camada que conhece URLs, nomes de query params e o
 * formato cru das respostas — e é onde toda resposta é validada com Zod antes
 * de entrar no app.
 *
 * O QUE ELE NÃO FAZ: não conhece React (nada de hooks aqui) e não decide nada
 * sobre a tela. É por isso que trocar a API não obriga a mexer na interface.
 *
 * Todo método de leitura aceita um `signal`: é por ele que o TanStack Query
 * cancela a requisição quando ninguém mais precisa da resposta.
 */

/** Traduz a ordenação da UI para os parâmetros da API. */
const SORT_PARAMS: Record<ProductSort, { sortBy: string; order: 'asc' | 'desc' }> = {
  'title-asc': { sortBy: 'title', order: 'asc' },
  'title-desc': { sortBy: 'title', order: 'desc' },
  'price-asc': { sortBy: 'price', order: 'asc' },
  'price-desc': { sortBy: 'price', order: 'desc' },
}

export const productsService = {
  /**
   * Lista produtos com busca, filtro por categoria, ordenação e paginação.
   *
   * ⚠️ LIMITAÇÃO REAL DA API (verificada, não suposta): busca e categoria são
   * endpoints DIFERENTES e não se combinam. Passar `category` junto de `q` em
   * /products/search não filtra nada — o parâmetro é simplesmente ignorado.
   * Por isso a busca tem prioridade aqui, e a interface desabilita o filtro de
   * categoria enquanto há texto buscado, em vez de mentir para o usuário.
   */
  async list(query: ProductQuery, signal?: AbortSignal): Promise<ProductListResult> {
    const search = query.search.trim()

    const path = search
      ? '/products/search'
      : query.category
        ? `/products/category/${encodeURIComponent(query.category)}`
        : '/products'

    const response = await http.get<unknown>(path, {
      signal,
      params: {
        // `undefined` é omitido da query string pelo cliente HTTP.
        q: search || undefined,
        limit: query.pageSize,
        // A API pagina por "skip" (offset); a UI conta páginas a partir de 1.
        skip: (query.page - 1) * query.pageSize,
        ...SORT_PARAMS[query.sort],
      },
    })

    const { products, total } = productListResponseSchema.parse(response)

    return { products, total }
  },

  /** GET /products/:id — responde 404 com `{ message }` quando não existe. */
  async getById(id: number, signal?: AbortSignal): Promise<Product> {
    const response = await http.get<unknown>(`/products/${id}`, { signal })

    return productSchema.parse(response)
  },

  /** Categorias disponíveis, para o filtro e para o formulário. */
  async listCategories(signal?: AbortSignal): Promise<string[]> {
    const response = await http.get<unknown>('/products/category-list', { signal })

    return categoryListSchema.parse(response)
  },

  /**
   * POST /products/add
   *
   * ⚠️ A API SIMULA a escrita: responde 201 com um id novo, mas NÃO persiste.
   * Buscar esse id logo depois devolve 404 (verificado). A interface avisa o
   * usuário disso — ver o aviso nas telas de produto.
   *
   * Os `values` não são validados de novo aqui: já passaram pelo esquema do
   * formulário, e o TypeScript garante que só um `ProductFormValues` chega a
   * este ponto. Validamos nas BORDAS (o que o usuário digita, o que a rede
   * devolve), não a cada chamada de função interna.
   */
  async create(values: ProductFormValues): Promise<{ id: number }> {
    const response = await http.post<unknown>('/products/add', values)

    return productWriteResponseSchema.parse(response)
  },

  /** PUT /products/:id — também simulado, não persiste. */
  async update(id: number, values: ProductFormValues): Promise<{ id: number }> {
    const response = await http.put<unknown>(`/products/${id}`, values)

    return productWriteResponseSchema.parse(response)
  },

  /**
   * DELETE /products/:id — simulado. Responde 200 com o produto e
   * `isDeleted: true`, mas o registro continua lá na próxima requisição.
   *
   * Não validamos a resposta com Zod porque nada dela é usado: só precisamos
   * saber que o status foi 2xx (o cliente HTTP já lança em caso de erro).
   */
  async remove(id: number): Promise<void> {
    await http.delete<unknown>(`/products/${id}`)
  },
}
