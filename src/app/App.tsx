import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { AuthGate } from '@/features/auth/components/AuthGate'
import { queryClient } from '@/lib/query/query-client'

import { router } from './router'

/**
 * Raiz de composição da aplicação.
 *
 * A ORDEM DOS PROVIDERS importa e é a parte que vale entender aqui:
 *
 *   ErrorBoundary          captura erros de render de tudo que está dentro
 *     QueryClientProvider  entrega o cache de estado de servidor à árvore. Fica
 *                          por fora do AuthGate porque a sessão também é
 *                          resolvida com requisições — e porque o cache precisa
 *                          existir antes de qualquer tela pedir dados
 *       AuthGate           resolve a sessão ANTES de o router existir. É isso
 *                          que permite às rotas protegidas decidirem com uma
 *                          resposta definitiva, em vez de "ainda não sei"
 *         RouterProvider   a aplicação em si
 *
 * Repare no que NÃO existe mais aqui: o AuthProvider. A sessão agora vive numa
 * store Zustand (features/auth/store/auth.store.ts), que é global e não depende
 * da árvore React — por isso não há Provider para ela. O <AuthGate> não fornece
 * nada: ele só segura o render enquanto o token é revalidado.
 */
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
