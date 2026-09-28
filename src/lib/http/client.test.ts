import { http as msw, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_BASE } from '@/test/handlers'
import { server } from '@/test/server'

import { registerAuthBridge, type AuthBridge } from './auth-bridge'
import { http } from './client'
import { HttpError, NetworkError, SessionExpiredError } from './errors'

/**
 * Testes do cliente HTTP.
 *
 * É a peça mais delicada do projeto — um erro aqui desloga usuários no meio do
 * trabalho ou entra em loop de requisições — e seus casos mais perigosos
 * (corrida entre refreshes, 401 persistente) são difíceis de provocar pela
 * interface. Por isso ele tem testes próprios, que olham só COMPORTAMENTO
 * OBSERVÁVEL: o que a função devolve e quais requisições saem.
 *
 * O caminho feliz da sessão (header Authorization, refresh que falha → login
 * com aviso) já é coberto de ponta a ponta em features/auth/auth.test.tsx.
 */

let restoreBridge: (() => void) | null = null

/** Registra a ponte de autenticação só para o teste atual. */
function installBridge(overrides: Partial<AuthBridge>) {
  restoreBridge = registerAuthBridge({
    getAccessToken: () => 'token-valido',
    refreshSession: async () => null,
    onSessionExpired: () => {},
    ...overrides,
  })
}

afterEach(() => {
  restoreBridge?.()
  restoreBridge = null
})

/** Servidor que só aceita `token`, respondendo 401 para qualquer outro. */
function acceptOnly(token: string) {
  server.use(
    msw.get(`${API_BASE}/products`, ({ request }) =>
      request.headers.get('Authorization') === `Bearer ${token}`
        ? HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
        : HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 }),
    ),
  )
}

describe('cliente HTTP', () => {
  it('não envia Authorization quando skipAuth está ativo (caso do login)', async () => {
    installBridge({})

    let received: string | null = 'ainda-nao-verificado'
    server.use(
      msw.post(`${API_BASE}/auth/login`, ({ request }) => {
        received = request.headers.get('Authorization')
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'b' })
      }),
    )

    await http.post('/auth/login', {}, { skipAuth: true })

    expect(received).toBeNull()
  })

  it('converte status de erro em HttpError e falha de rede em NetworkError', async () => {
    server.use(
      msw.get(`${API_BASE}/products/999`, () =>
        HttpResponse.json({ message: "Product with id '999' not found" }, { status: 404 }),
      ),
      msw.get(`${API_BASE}/products`, () => HttpResponse.error()),
    )

    // A UI decide o que mostrar (e se oferece "tentar novamente") a partir
    // destes campos — por isso a mensagem da API precisa sobreviver.
    const error = await http.get('/products/999').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({
      status: 404,
      isNotFound: true,
      message: "Product with id '999' not found",
    })

    await expect(http.get('/products')).rejects.toBeInstanceOf(NetworkError)
  })

  it('renova a sessão UMA vez para várias requisições com 401 e repete todas', async () => {
    /**
     * Protege contra um bug real e difícil de perceber: como a API ROTACIONA o
     * refresh token, dois refreshes simultâneos fariam o segundo usar um token
     * já invalidado — derrubando a sessão do usuário sem motivo.
     */
    let currentToken = 'token-expirado'
    const refreshSession = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      currentToken = 'token-novo'
      return currentToken
    })
    installBridge({ getAccessToken: () => currentToken, refreshSession })
    acceptOnly('token-novo')

    const results = await Promise.all([
      http.get<{ total: number }>('/products'),
      http.get<{ total: number }>('/products'),
      http.get<{ total: number }>('/products'),
    ])

    // Todas deram certo SEM o usuário perceber nada.
    expect(results.map((result) => result.total)).toEqual([0, 0, 0])
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('não tenta renovar indefinidamente se o 401 persistir após o refresh', async () => {
    const refreshSession = vi.fn(async () => 'token-novo-mas-inutil')
    const onSessionExpired = vi.fn()
    installBridge({ getAccessToken: () => 'qualquer', refreshSession, onSessionExpired })
    acceptOnly('nenhum-token-serve')

    await expect(http.get('/products')).rejects.toBeInstanceOf(SessionExpiredError)

    // Uma única tentativa de refresh: sem isso, seria um loop infinito.
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('monta a query string ignorando valores undefined', async () => {
    let requestUrl = ''
    server.use(
      msw.get(`${API_BASE}/products`, ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    await http.get('/products', { params: { limit: 12, skip: 0, q: undefined } })

    // O bug que isto evita: "q=undefined" (a string!) faria a API buscar
    // literalmente por "undefined".
    expect(Object.fromEntries(new URL(requestUrl).searchParams)).toEqual({ limit: '12', skip: '0' })
  })
})
