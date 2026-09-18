import { useMutation, useQueryClient } from '@tanstack/react-query'

import { productsService } from '../services/products.service'
import type { ProductFormValues } from '../types/product.types'
import { productKeys } from './product-keys'

/**
 * Hooks de ESCRITA da feature de produtos (criar, editar, excluir).
 *
 * O MOTIVO DE ESTE ARQUIVO EXISTIR — INVALIDAÇÃO DE CACHE:
 * com um cache, um dado gravado com sucesso deixa desatualizado tudo o que
 * dependia dele. A regra "o que esta operação torna obsoleto" mora ao lado da
 * própria operação, uma vez só.
 *
 * `invalidateQueries` NÃO limpa o cache: marca as chaves como obsoletas e
 * refaz AGORA as que estiverem sendo observadas por alguma tela. Quem está na
 * lista vê os dados novos sozinho; quem não está só refaz a busca ao voltar.
 *
 * ⚠️ Lembrete honesto sobre esta API: a DummyJSON SIMULA a escrita (responde
 * 2xx, não persiste). A invalidação está correta e é o que um backend real
 * exigiria — aqui ela simplesmente traz de volta os mesmos dados.
 */

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsService.create(values),

    onSuccess: () => {
      // Um produto novo pode aparecer em qualquer página/filtro: invalidamos o
      // ramo inteiro das listagens, e não uma combinação específica de filtros.
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsService.update(id, values),

    onSuccess: () => {
      /**
       * Duas chaves ficam obsoletas: o detalhe deste produto e as listagens
       * (título e preço aparecem nos cards).
       *
       * Poderíamos escrever a resposta direto no cache com `setQueryData` e
       * evitar uma requisição. Não fazemos porque a resposta de PUT desta API é
       * um ECO dos campos enviados, não o produto completo — gravá-la no cache
       * do detalhe apagaria campos que o formulário não edita. Refazer a busca
       * é mais lento e mais correto; a otimização vale quando o backend devolve
       * o recurso inteiro.
       */
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useDeleteProduct(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => productsService.remove(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() })

      /**
       * `refetchType: 'none'` no detalhe: a tela de detalhe AINDA está montada
       * neste instante (a navegação acontece logo depois, no callback da
       * página). Uma revalidação imediata iria buscar um produto que acabamos de
       * excluir e mostraria um 404 no meio do caminho. Marcamos como obsoleto
       * sem refazer: se o usuário voltar a essa URL, aí sim a busca acontece.
       */
      void queryClient.invalidateQueries({
        queryKey: productKeys.detail(id),
        refetchType: 'none',
      })
    },
  })
}
