import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { makeProduct } from '@/test/fixtures'
import { createTestQueryClient } from '@/test/test-utils'

import type { ProductFormValues, ProductQuery } from '../types/product.types'
import { productKeys } from './product-keys'
import { useCreateProduct, useDeleteProduct, useUpdateProduct } from './useProductMutations'

/**
 * Testes da INVALIDAÇÃO DE CACHE.
 *
 * Por que isto merece teste próprio: invalidação é a parte que falha em
 * SILÊNCIO. Se a chave estiver errada, nada quebra — a mutação continua dando
 * certo, a tela só para de se atualizar sozinha, e alguém descobre meses
 * depois reclamando que "precisa dar F5". Testar o contrato ("depois de
 * gravar, a listagem está marcada como obsoleta") trava esse comportamento.
 *
 * Trabalhamos com o cache REAL (nada de espiar chamadas a `invalidateQueries`):
 * plantamos dados no cliente, rodamos a mutação contra o MSW e perguntamos ao
 * cache em que estado cada chave ficou.
 */

const LIST_QUERY: ProductQuery = {
  page: 1,
  pageSize: 12,
  search: '',
  category: '',
  sort: 'title-asc',
}

const FORM_VALUES: ProductFormValues = {
  title: 'Notebook Pro 14',
  description: 'Notebook para desenvolvimento com 16GB de memória.',
  category: 'laptops',
  price: 1299.99,
  stock: 25,
  discountPercentage: 10,
}

/** Cliente com as duas chaves já preenchidas, como depois de visitar as telas. */
function setupCache() {
  const queryClient = createTestQueryClient()

  queryClient.setQueryData(productKeys.list(LIST_QUERY), {
    products: [makeProduct()],
    total: 1,
  })
  queryClient.setQueryData(productKeys.detail(1), makeProduct())

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { queryClient, wrapper }
}

/** `isInvalidated` é como o cache registra "este dado não vale mais". */
function isInvalidated(queryClient: ReturnType<typeof createTestQueryClient>, key: unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated ?? false
}

describe('mutações de produto', () => {
  it('invalida as listagens depois de criar', async () => {
    const { queryClient, wrapper } = setupCache()

    const { result } = renderHook(() => useCreateProduct(), { wrapper })
    result.current.mutate(FORM_VALUES)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Um produto novo pode cair em qualquer página da lista.
    expect(isInvalidated(queryClient, [...productKeys.list(LIST_QUERY)])).toBe(true)
  })

  it('invalida a listagem e o detalhe do produto editado', async () => {
    const { queryClient, wrapper } = setupCache()

    const { result } = renderHook(() => useUpdateProduct(1), { wrapper })
    result.current.mutate(FORM_VALUES)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(isInvalidated(queryClient, [...productKeys.list(LIST_QUERY)])).toBe(true)
    expect(isInvalidated(queryClient, [...productKeys.detail(1)])).toBe(true)
  })

  it('invalida o detalhe SEM rebuscá-lo depois de excluir', async () => {
    const { queryClient, wrapper } = setupCache()

    const { result } = renderHook(() => useDeleteProduct(1), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(isInvalidated(queryClient, [...productKeys.list(LIST_QUERY)])).toBe(true)
    expect(isInvalidated(queryClient, [...productKeys.detail(1)])).toBe(true)

    // `refetchType: 'none'`: nada de ir buscar um produto recém-excluído (seria
    // um 404 na cara do usuário enquanto a navegação acontece). O dado antigo
    // continua no cache, apenas marcado como obsoleto.
    expect(queryClient.getQueryData(productKeys.detail(1))).toBeDefined()
    expect(queryClient.isFetching()).toBe(0)
  })
})
