import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { productsService } from '../services/products.service'
import type { ProductQuery } from '../types/product.types'
import { productKeys } from './product-keys'

/**
 * Hooks de leitura da feature de produtos.
 *
 * O PAPEL DESTA CAMADA — por que a página não chama o service direto:
 * ela liga o service (que não conhece React) ao ciclo de vida do componente,
 * declarando QUAL é o dado (a chave), COMO buscá-lo (o `queryFn`) e por quanto
 * tempo ele vale. O componente fica só com a apresentação.
 *
 * Fluxo completo: UI (página) → hook → service → cliente HTTP → API.
 *
 * O `signal` que o TanStack Query entrega ao `queryFn` é repassado ao service e
 * daí ao `fetch`: quando o componente desmonta ou a chave muda, a requisição em
 * andamento é cancelada — o mesmo cuidado que o hook antigo tinha, agora de graça.
 */

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: ({ signal }) => productsService.list(query, signal),

    /**
     * Paginação sem piscar: ao trocar de página, a lista anterior continua na
     * tela (marcada como `isPlaceholderData`) enquanto a nova carrega, em vez de
     * a tela inteira voltar ao estado de carregamento. É o comportamento que o
     * hook antigo não tinha — ele zerava os dados a cada mudança de filtro.
     */
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => productsService.getById(id, signal),

    // Um id inválido vindo da URL (/products/abc vira NaN) não deve gerar uma
    // requisição garantidamente inútil. A página trata esse caso à parte.
    enabled: Number.isInteger(id),
  })
}

/**
 * Categorias são praticamente estáticas e usadas em duas telas (filtro e
 * formulário).
 *
 * ANTES: sem cache compartilhado, cada tela repetia a requisição. AGORA: a chave
 * é a mesma nas duas, então a segunda tela lê do cache — e o `staleTime` alto
 * evita revalidar um dado que quase nunca muda. Era exatamente este o "sinal de
 * adotar uma lib de server state" anotado na versão anterior deste arquivo.
 */
export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: ({ signal }) => productsService.listCategories(signal),
    staleTime: 60 * 60_000,
  })
}
