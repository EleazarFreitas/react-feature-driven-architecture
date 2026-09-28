import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { routes } from '@/app/router'
import { AuthGate } from '@/features/auth/components/AuthGate'
import { useAuthStore } from '@/features/auth/store/auth.store'
import type { Role } from '@/features/auth/types/auth.types'

import { makeJwt, makeUser } from './fixtures'
import { API_BASE } from './handlers'
import { server } from './server'

/**
 * Helpers de renderização.
 *
 * A suíte segue o "Testing Trophy": o grosso da confiança vem de testes de
 * INTEGRAÇÃO que montam a aplicação de verdade — a mesma tabela de rotas, as
 * mesmas guardas, o mesmo layout — e só trocam o servidor pelo MSW. Por isso há
 * um único helper de tela, o `renderApp`: um teste que monta uma árvore feita
 * sob medida valida uma aplicação que não existe em produção.
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

interface RenderAppOptions {
  /**
   * Papel do usuário com sessão já salva. Omitido = visitante sem sessão.
   *
   * A sessão é semeada na store com `status: 'loading'` — o mesmo estado que a
   * reidratação do `persist` produz num F5. Assim o <AuthGate> busca /auth/me
   * e é o caminho REAL de restauração de sessão que roda em todo teste. O papel
   * sai da resposta desse /auth/me, como na API de verdade.
   */
  as?: Role
  /** Opções do userEvent (ex.: `{ applyAccept: false }` no upload). */
  userOptions?: Parameters<typeof userEvent.setup>[0]
}

/**
 * Renderiza a aplicação inteira numa URL.
 *
 * Usa `createMemoryRouter` (o jsdom não tem a API de histórico do navegador)
 * com a MESMA tabela exportada por app/router.tsx. As páginas são `lazy`, então
 * os testes esperam com `findBy*`.
 */
export function renderApp(
  route: string,
  { as, userOptions }: RenderAppOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  if (as !== undefined) {
    // Mexer na store (e não no localStorage) mantém o helper imune a mudanças
    // no formato da persistência: o `persist` grava sozinho em seguida.
    useAuthStore.setState({
      tokens: { accessToken: makeJwt(), refreshToken: makeJwt(86400) },
      status: 'loading',
      user: null,
    })
    // O handler padrão de /auth/me já devolve um admin. Só sobrescrevemos para
    // os outros papéis — o que deixa um teste de admin livre para instalar o
    // próprio /auth/me (ex.: um 401) antes de chamar o renderApp.
    if (as !== 'admin') {
      server.use(http.get(`${API_BASE}/auth/me`, () => HttpResponse.json(makeUser(as))))
    }
  }

  const router = createMemoryRouter(routes, { initialEntries: [route] })

  return {
    // `userEvent` simula interação de verdade (foco, teclas, eventos na ordem
    // correta) — mais próximo do usuário real do que `fireEvent`.
    user: userEvent.setup(userOptions),
    // Mesma ordem de providers do app/App.tsx — se ela mudar lá, muda aqui.
    ...render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </QueryClientProvider>,
    ),
  }
}
