import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import userEvent, { type Options, type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { routes } from '@/app/router'
import { useAuthStore } from '@/features/auth/store/auth.store'
import type { Role } from '@/features/auth/types/auth.types'

import { makeUser, TEST_TOKENS } from './fixtures'
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
 * `retry: false` difere de produção de propósito: com retentativa, o teste de
 * erro esperaria os backoffs e um handler `{ once: true }` seria "corrigido"
 * pela segunda tentativa, escondendo o estado de erro que queremos verificar.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

interface RenderAppOptions {
  /**
   * Papel do usuário com sessão já salva. Omitido = visitante sem sessão.
   *
   * Semeamos na store apenas os TOKENS — exatamente o que o `persist` reidrata
   * num F5. Assim o loader da rota raiz busca /auth/me, e é o caminho REAL de
   * restauração de sessão que roda em todo teste. O papel sai da resposta desse
   * /auth/me, como na API de verdade.
   */
  as?: Role
  /** Opções do userEvent (ex.: `{ applyAccept: false }` no upload). */
  userOptions?: Options
}

/**
 * Renderiza a aplicação inteira numa URL.
 *
 * Usa `createMemoryRouter` (histórico em memória, sem depender da barra de
 * endereços) com a MESMA tabela exportada por app/router.tsx. As páginas são
 * `lazy` e a sessão é resolvida num loader, então os testes esperam o primeiro
 * elemento com `findBy*`.
 */
export function renderApp(
  route: string,
  { as, userOptions }: RenderAppOptions = {},
): RenderResult & { user: UserEvent } {
  if (as !== undefined) {
    useAuthStore.setState({ tokens: TEST_TOKENS })

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
    // Mesmos providers do app/App.tsx — se mudarem lá, mudam aqui.
    ...render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}
