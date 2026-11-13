import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { isRetryable } from '@/lib/http/errors'
import { logger } from '@/lib/logger'

/**
 * Cache de ESTADO DE SERVIDOR da aplicação (TanStack Query v5).
 *
 * Sem um cache compartilhado, cada tela repetiria as mesmas requisições e uma
 * mutação não teria como avisar a lista de que os dados mudaram — é
 * exatamente isso que a biblioteca resolve.
 *
 * O QUE GANHAMOS AO ADOTÁ-LA:
 *   - cache por chave, compartilhado entre telas (categorias são buscadas uma
 *     vez, não uma por página);
 *   - deduplicação: dois componentes pedindo a mesma chave = uma requisição;
 *   - stale-while-revalidate: mostra o dado em cache e revalida em segundo plano;
 *   - cancelamento via `AbortSignal` entregue ao `queryFn` (que repassamos ao
 *     cliente HTTP);
 *   - INVALIDAÇÃO após mutação — a lista se atualiza sozinha, sem reload.
 *
 * Os testes NÃO usam esta instância: cada teste cria a sua (ver
 * test/test-utils.tsx), senão o cache de um vazaria para o seguinte.
 */
export const queryClient = new QueryClient({
  /**
   * Log centralizado. O TanStack Query CAPTURA os erros e os guarda no estado
   * da query/mutação — ótimo para a tela, mas nada aparece no console. Estes
   * dois callbacks globais garantem que toda falha de dados passe pelo logger
   * (e, em produção, pelo serviço de observabilidade ligado a ele).
   */
  queryCache: new QueryCache({
    onError: (error, query) => {
      logger.error('Falha ao buscar dados', error, { queryKey: query.queryKey })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      logger.error('Falha ao gravar dados', error)
    },
  }),

  defaultOptions: {
    queries: {
      /**
       * Por quanto tempo o dado é considerado FRESCO. Dentro dessa janela,
       * remontar a tela usa o cache sem ir à rede. Zero (o padrão) faria toda
       * navegação disparar uma requisição nova — 30s é um meio-termo seguro
       * para um catálogo administrativo.
       */
      staleTime: 30_000,

      /**
       * Retentar só o que tem chance de dar certo na segunda vez. O padrão da
       * biblioteca (3 tentativas para qualquer erro) insistiria em um 404 ou
       * em um 400 de validação — repetição inútil que só atrasa a mensagem de
       * erro para o usuário. `isRetryable` já codifica essa regra
       * (ver lib/http/errors.ts): rede e 5xx sim, 4xx não.
       */
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
    },

    // Mutações não são repetidas automaticamente (é o padrão da biblioteca, e o
    // certo): reenviar um POST que falhou pode duplicar o efeito no servidor.
    // Quem decide tentar de novo é o usuário, clicando outra vez.
  },
})
