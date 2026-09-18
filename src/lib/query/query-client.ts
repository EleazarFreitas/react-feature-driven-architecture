import { QueryClient } from '@tanstack/react-query'

import { isRetryable } from '@/lib/http/errors'

/**
 * Configuração única do cache de ESTADO DE SERVIDOR (TanStack Query v5).
 *
 * Sem um cache compartilhado, cada tela repetiria as mesmas requisições e uma
 * mutação não teria como avisar a lista de que os dados mudaram — é
 * exatamente isso que a biblioteca resolve.
 *
 * O QUE GANHAMOS DE GRAÇA AO ADOTÁ-LA:
 *   - cache por chave, compartilhado entre telas (categorias são buscadas uma
 *     vez, não uma por página);
 *   - deduplicação: dois componentes pedindo a mesma chave = uma requisição;
 *   - stale-while-revalidate: mostra o dado em cache e revalida em segundo plano;
 *   - cancelamento via `AbortSignal` entregue ao `queryFn` (continuamos
 *     repassando esse signal para o cliente HTTP);
 *   - INVALIDAÇÃO após mutação — a lista se atualiza sozinha, sem reload.
 *
 * DUAS FÁBRICAS, UM SÓ COMPORTAMENTO: `createQueryClient()` existe para que os
 * testes montem uma instância limpa por teste (cache compartilhado entre testes
 * é fonte clássica de teste que só passa quando roda sozinho), enquanto o app
 * usa o singleton `queryClient` exportado abaixo.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Por quanto tempo o dado é considerado FRESCO. Dentro dessa janela,
         * remontar a tela usa o cache sem ir à rede. Zero (o padrão) faria toda
         * navegação disparar uma requisição nova — 30s é um meio-termo seguro
         * para um catálogo administrativo.
         */
        staleTime: 30_000,

        /** Quanto tempo um dado sem nenhum componente observando sobrevive no cache. */
        gcTime: 5 * 60_000,

        /**
         * Retentar só o que tem chance de dar certo na segunda vez. O padrão da
         * biblioteca (3 tentativas para qualquer erro) insistiria em um 404 ou
         * em um 400 de validação — repetição inútil que só atrasa a mensagem de
         * erro para o usuário. `isRetryable` já codifica essa regra
         * (ver lib/http/errors.ts): rede e 5xx sim, 4xx não.
         */
        retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      },

      mutations: {
        // Repetir um POST/PUT/DELETE que falhou pode duplicar efeito no servidor.
        // Quem decide tentar de novo é o usuário, clicando outra vez.
        retry: false,
      },
    },
  })
}

/** Instância usada pela aplicação (ver app/App.tsx). */
export const queryClient = createQueryClient()
