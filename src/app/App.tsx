import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { queryClient } from '@/lib/query/query-client'

import { router } from './router'

/**
 * Raiz de composição da aplicação.
 *
 *   ErrorBoundary          última rede de segurança: captura erros de render
 *                          de tudo que está dentro
 *     QueryClientProvider  entrega o cache de estado de servidor à árvore
 *       RouterProvider     a aplicação em si
 *
 * Repare no que NÃO está aqui: um provider de autenticação. A sessão vive numa
 * store Zustand (features/auth/store/auth.store.ts), que é global e não depende
 * da árvore React — não há o que "prover". E quem espera a sessão ser resolvida
 * antes do primeiro render é o loader da rota raiz (ver ./router.tsx).
 */
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
