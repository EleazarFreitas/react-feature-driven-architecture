import type { ProductQuery } from '../types/product.types'

/**
 * Chaves de cache da feature de produtos.
 *
 * POR QUE UMA FÁBRICA DE CHAVES E NÃO ARRAYS SOLTOS PELO CÓDIGO:
 * a chave é o identificador do dado no cache. Escrevê-la à mão em cada hook
 * funciona até o dia em que um arquivo usa `['products', query]` e outro usa
 * `['product-list', query]` — aí a invalidação depois de uma mutação passa a não
 * encontrar nada, silenciosamente, e a tela para de se atualizar sem erro nenhum.
 *
 * A estrutura é HIERÁRQUICA de propósito. O TanStack Query casa chaves por
 * PREFIXO, então:
 *
 *   invalidateQueries({ queryKey: productKeys.all })      → tudo de produtos
 *   invalidateQueries({ queryKey: productKeys.lists() })  → só as listagens
 *   invalidateQueries({ queryKey: productKeys.detail(7) }) → só o produto 7
 *
 * `as const` em toda chave: sem ele o TypeScript infere `string[]` e perdemos a
 * checagem de que a chave montada é a esperada.
 */
export const productKeys = {
  all: ['products'] as const,

  lists: () => [...productKeys.all, 'list'] as const,

  /**
   * O objeto de filtros entra na chave inteiro. Pode: a biblioteca serializa a
   * chave de forma DETERMINÍSTICA (ordena as chaves do objeto), então
   * `{ page: 1, search: '' }` e `{ search: '', page: 1 }` são a mesma entrada de
   * cache — diferente do array de dependências do `useEffect`, que comparava por
   * identidade e nos obrigava a listar campo por campo.
   */
  list: (query: ProductQuery) => [...productKeys.lists(), query] as const,

  details: () => [...productKeys.all, 'detail'] as const,

  detail: (id: number) => [...productKeys.details(), id] as const,

  categories: () => [...productKeys.all, 'categories'] as const,
}
