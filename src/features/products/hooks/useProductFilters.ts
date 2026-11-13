import { useSearchParams } from 'react-router'

import type { ProductQuery, ProductSort } from '../types/product.types'

/**
 * Filtros da listagem guardados na URL (?search=&category=&page=&sort=).
 *
 * POR QUE NA URL E NÃO EM useState?
 * Porque esse estado descreve O QUE ESTÁ SENDO MOSTRADO, e isso deveria
 * sobreviver a coisas que o `useState` não sobrevive:
 *   - recarregar a página mantém o filtro;
 *   - o link pode ser copiado e enviado para outra pessoa;
 *   - o botão "voltar" do navegador desfaz a troca de página, de categoria ou
 *     de ordenação, como o usuário espera.
 * Além disso não há duas fontes da verdade: a URL é a única.
 *
 * O preço é ler tudo como string e validar na entrada — é o que as funções
 * abaixo fazem. Query string é entrada do usuário: qualquer um pode escrever
 * `?page=abc` ou `?sort=hack` na barra de endereços.
 *
 * Repare que não há `useMemo`/`useCallback` aqui: `query` é só um objeto
 * montado a cada render a partir da URL (barato), e nada neste arquivo depende
 * de as funções manterem a mesma identidade entre renders.
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

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const sortParam = searchParams.get('sort') ?? ''

  const query: ProductQuery = {
    page: parsePage(searchParams.get('page')),
    pageSize: PAGE_SIZE,
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    sort: isProductSort(sortParam) ? sortParam : DEFAULT_SORT,
  }

  /**
   * Atualiza parâmetros preservando os demais.
   *
   * `resetPage` existe por um bug de UX muito comum: estando na página 5 e
   * aplicando um filtro que só tem 2 páginas, o usuário veria uma lista vazia.
   * Toda mudança de filtro volta para a página 1.
   *
   * `replace` decide se a mudança cria uma entrada no histórico do navegador
   * (o padrão) ou substitui a atual.
   */
  function updateParams(
    changes: Record<string, string>,
    { resetPage = true, replace = false } = {},
  ) {
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
      { replace },
    )
  }

  return {
    query,
    /** true quando há busca ou categoria aplicada — usado pelo estado vazio. */
    hasActiveFilters: query.search !== '' || query.category !== '',

    // Busca e categoria são endpoints distintos na API e não se combinam (ver
    // products.service). Aplicar um limpa o outro, para que a URL reflita
    // exatamente o que o servidor vai devolver.
    //
    // A busca usa `replace`: ela é disparada a cada pausa na digitação, e sem
    // isso buscar "notebook gamer" deixaria várias entradas no histórico — o
    // usuário teria de apertar "voltar" várias vezes para sair da tela.
    setSearch: (search: string) => updateParams({ search, category: '' }, { replace: true }),
    setCategory: (category: string) => updateParams({ category, search: '' }),
    setSort: (sort: ProductSort) => updateParams({ sort }),
    // Trocar de página é o único caso que NÃO volta para a página 1.
    setPage: (page: number) => updateParams({ page: String(page) }, { resetPage: false }),
    clearFilters: () => updateParams({ search: '', category: '' }),
  }
}

/** O que a página entrega ao <ProductFilters>. */
export type ProductFiltersController = ReturnType<typeof useProductFilters>
