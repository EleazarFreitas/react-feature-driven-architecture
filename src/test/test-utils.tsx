import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom'

import { AuthGate } from '@/features/auth/components/AuthGate'
import { useAuthStore } from '@/features/auth/store/auth.store'

import { makeJwt } from './fixtures'

/**
 * Helpers de renderização.
 *
 * Sem eles, todo teste repetiria o mesmo empilhamento de Providers — e, pior,
 * cada um poderia montá-lo de um jeito diferente do que a aplicação real usa,
 * fazendo o teste validar uma árvore que não existe em produção.
 */

/**
 * QueryClient exclusivo de cada renderização.
 *
 * ISTO NÃO É DETALHE: o cliente da aplicação é um singleton com cache. Se os
 * testes o compartilhassem, o resultado de um vazaria para o outro (a lista
 * buscada no teste 1 seria servida do cache no teste 2, sem tocar no MSW) e a
 * ordem de execução passaria a importar. Uma instância por teste mantém cada
 * caso isolado e reordenável.
 *
 * As opções abaixo diferem de propósito das de produção (lib/query/query-client):
 *   - `retry: false` — com retentativa, o teste de erro esperaria os backoffs e
 *     um handler `{ once: true }` seria "corrigido" pela segunda tentativa,
 *     escondendo o estado de erro que queremos verificar;
 *   - `staleTime: 0` — cada teste quer o dado do seu próprio handler;
 *   - `refetchOnWindowFocus: false` — o jsdom dispara foco em situações que o
 *     navegador real não dispararia (ex.: `userEvent` clicando).
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

/**
 * Coloca tokens na store ANTES de renderizar, simulando "usuário que já tinha
 * sessão". O `status: 'loading'` é o mesmo estado que a reidratação do `persist`
 * produz num F5 — então o <AuthGate> vai buscar /auth/me e é esse caminho real
 * de restauração de sessão que os testes exercitam.
 *
 * Mexer na store (e não no localStorage) mantém o helper imune a mudanças no
 * formato da persistência: o `persist` grava sozinho em seguida.
 */
export function seedAuthenticatedSession(): void {
  useAuthStore.setState({
    tokens: { accessToken: makeJwt(), refreshToken: makeJwt(86400) },
    status: 'loading',
    user: null,
  })
}

interface RenderWithProvidersOptions {
  /** Rota inicial. Use para testar páginas que leem parâmetros da URL. */
  route?: string
  /** Permite inspecionar/pré-popular o cache num teste específico. */
  queryClient?: QueryClient
}

type RenderWithProvidersResult = RenderResult & {
  user: ReturnType<typeof userEvent.setup>
  queryClient: QueryClient
}

/**
 * Renderiza uma árvore dentro dos providers da aplicação (memória em vez de
 * história real do navegador, que não existe no jsdom).
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', queryClient = createTestQueryClient() }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const routes: RouteObject[] = [
    { path: '*', element: <Providers queryClient={queryClient}>{ui}</Providers> },
  ]
  const router = createMemoryRouter(routes, { initialEntries: [route] })

  return {
    // `userEvent` simula interação de verdade (foco, teclas, eventos na ordem
    // correta) — mais próximo do usuário real do que `fireEvent`.
    user: userEvent.setup(),
    queryClient,
    ...render(<RouterProvider router={router} />),
  }
}

/**
 * Renderiza uma árvore de ROTAS completa, para testar navegação, guardas e
 * redirecionamentos — coisas que só existem quando há mais de uma rota.
 */
export function renderWithRouter(
  routes: RouteObject[],
  { route = '/', queryClient = createTestQueryClient() }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const router = createMemoryRouter(routes, { initialEntries: [route] })

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <Providers queryClient={queryClient}>
        <RouterProvider router={router} />
      </Providers>,
    ),
  }
}

/**
 * Mesma ordem do app/App.tsx — se ela mudar lá, muda aqui. A sessão vive numa
 * store global; o <AuthGate> apenas segura o render enquanto o token é
 * revalidado.
 */
function Providers({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  )
}
