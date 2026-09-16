import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { ProductQuery, ProductSort } from '../types/product.types'

/**
 * Filtros da listagem guardados na URL (?search=&category=&page=&sort=).
 *
 * POR QUE NA URL E NÃO EM useState?
 * Porque esse estado descreve O QUE ESTÁ SENDO MOSTRADO, e isso deveria
 * sobreviver a coisas que o `useState` não sobrevive:
 *   - recarregar a página mantém o filtro;
 *   - o link pode ser copiado e enviado para outra pessoa;
 *   - o botão "voltar" do navegador desfaz o filtro, como o usuário espera.
 * Além disso não há duas fontes da verdade: a URL é a única.
 *
 * O preço é ler tudo como string e validar na entrada — é o que as funções
 * abaixo fazem. Query string é entrada do usuário: qualquer um pode escrever
 * `?page=abc` ou `?sort=hack` na barra de endereços.
 */

const PAGE_SIZE = 12

const VALID_SORTS: readonly ProductSort[] = ['title-asc', 'title-desc', 'price-asc', 'price-desc']

const DEFAULT_SORT: ProductSort = 'title-asc'

/** Type guard: estreita `string` para `ProductSort`. */
function isProductSort(value: string): value is ProductSort {
  return (VALID_SORTS as readonly string[]).includes(value)
}

function parsePage(raw: string | null): number {
  const page = Number(raw)
  // Cobre de uma vez "abc" (NaN), "0", "-3" e valores fracionários.
  return Number.isInteger(page) && page > 0 ? page : 1
}

export interface ProductFiltersController {
  query: ProductQuery
  setSearch: (search: string) => void
  setCategory: (category: string) => void
  setSort: (sort: ProductSort) => void
  setPage: (page: number) => void
  clearFilters: () => void
  /** true quando há algum filtro ativo — usado pelo estado vazio. */
  hasActiveFilters: boolean
}

export function useProductFilters(): ProductFiltersController {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = useMemo<ProductQuery>(() => {
    const sortParam = searchParams.get('sort') ?? ''

    return {
      page: parsePage(searchParams.get('page')),
      pageSize: PAGE_SIZE,
      search: searchParams.get('search') ?? '',
      category: searchParams.get('category') ?? '',
      sort: isProductSort(sortParam) ? sortParam : DEFAULT_SORT,
    }
  }, [searchParams])

  /**
   * Atualiza parâmetros preservando os demais.
   *
   * `resetPage` existe por um bug de UX muito comum: estando na página 5 e
   * aplicando um filtro que só tem 2 páginas, o usuário veria uma lista vazia.
   * Toda mudança de filtro volta para a página 1.
   */
  const updateParams = useCallback(
    (changes: Record<string, string>, resetPage = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)

          for (const [key, value] of Object.entries(changes)) {
            // Remover o parâmetro em vez de deixá-lo vazio mantém a URL limpa
            // (?search=&category= não ajuda ninguém).
            if (value === '') next.delete(key)
            else next.set(key, value)
          }

          if (resetPage) next.delete('page')

          return next
        },
        // `replace` evita encher o histórico: digitar 8 letras na busca criaria
        // 8 entradas, e o usuário teria de apertar "voltar" 8 vezes.
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (search: string) => {
      // Busca e categoria são endpoints distintos na API e não se combinam
      // (ver products.service). Ao buscar, limpamos a categoria para que a URL
      // reflita exatamente o que o servidor vai devolver.
      updateParams({ search, category: '' })
    },
    [updateParams],
  )

  const setCategory = useCallback(
    (category: string) => updateParams({ category, search: '' }),
    [updateParams],
  )

  const setSort = useCallback((sort: ProductSort) => updateParams({ sort }), [updateParams])

  // Trocar de página é o único caso que NÃO reseta a página.
  const setPage = useCallback(
    (page: number) => updateParams({ page: String(page) }, false),
    [updateParams],
  )

  const clearFilters = useCallback(() => updateParams({ search: '', category: '' }), [updateParams])

  return {
    query,
    setSearch,
    setCategory,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters: query.search !== '' || query.category !== '',
  }
}
