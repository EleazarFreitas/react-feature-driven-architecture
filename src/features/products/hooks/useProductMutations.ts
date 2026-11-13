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
 * refaz AGORA as que estiverem sendo observadas por alguma tela. As demais só
 * são rebuscadas quando alguém voltar a precisar delas.
 *
 * Os `onSuccess` DEVOLVEM a promise da invalidação. Com isso a mutação continua
 * `isPending` até a revalidação terminar — o botão segue em "carregando" e,
 * quando a página navegar, a tela seguinte já encontra o dado novo no cache em
 * vez de piscar o antigo.
 *
 * ⚠️ Lembrete honesto sobre esta API: a DummyJSON SIMULA a escrita (responde
 * 2xx, não persiste). A invalidação está correta e é o que um backend real
 * exigiria — aqui ela simplesmente traz de volta os mesmos dados.
 */

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsService.create(values),

    // Um produto novo pode aparecer em qualquer página/filtro: invalidamos o
    // ramo inteiro das listagens, e não uma combinação específica de filtros.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  })
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsService.update(id, values),

    /**
     * Duas chaves ficam obsoletas: o detalhe deste produto e as listagens
     * (título e preço aparecem nos cards).
     *
     * A alternativa seria escrever a resposta direto no cache com
     * `setQueryData` e economizar uma requisição. Não fazemos porque o PUT
     * desta API devolve o produto incompleto — gravá-lo no cache do detalhe
     * apagaria campos que a tela usa. Refazer a busca é mais lento e mais
     * correto; a otimização vale quando o backend devolve o recurso inteiro.
     */
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
      ]),
  })
}

export function useDeleteProduct(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => productsService.remove(id),

    /**
     * `refetchType: 'none'` no detalhe: a tela de detalhe AINDA está montada
     * neste instante (a navegação acontece logo depois, no callback da
     * página). Uma revalidação imediata iria buscar um produto que acabamos de
     * excluir e mostraria um 404 no meio do caminho. Marcamos como obsoleto
     * sem refazer: se o usuário voltar a essa URL, aí sim a busca acontece.
     */
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.detail(id), refetchType: 'none' }),
      ]),
  })
}
