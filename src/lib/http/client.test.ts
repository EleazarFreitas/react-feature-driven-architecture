import { http as msw, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/test/server'

import { registerAuthBridge } from './auth-bridge'
import { http } from './client'
import { HttpError, NetworkError, SessionExpiredError } from './errors'

const BASE = 'https://dummyjson.test'

/**
 * Testes do cliente HTTP.
 *
 * Esta é a peça mais delicada do projeto: um erro aqui desloga usuários no meio
 * do trabalho ou entra em loop de requisições. É o tipo de código que compensa
 * testar de verdade — muito mais do que um componente de apresentação.
 *
 * Testamos COMPORTAMENTO OBSERVÁVEL (o que a função devolve, quais requisições
 * saem), nunca detalhes internos.
 */

/** Restaura a ponte de autenticação para não vazar entre testes. */
let restoreBridge: (() => void) | null = null

afterEach(() => {
  restoreBridge?.()
  restoreBridge = null
})

describe('cliente HTTP', () => {
  it('envia o header Authorization quando existe um token', async () => {
    restoreBridge = registerAuthBridge({
      getAccessToken: () => 'token-valido',
      refreshSession: async () => null,
      onSessionExpired: () => {},
    })

    let received: string | null = null
    server.use(
      msw.get(`${BASE}/products/1`, ({ request }) => {
        received = request.headers.get('Authorization')
        return HttpResponse.json({ id: 1 })
      }),
    )

    await http.get('/products/1')

    expect(received).toBe('Bearer token-valido')
  })

  it('não envia Authorization quando skipAuth está ativo (caso do login)', async () => {
    restoreBridge = registerAuthBridge({
      getAccessToken: () => 'token-valido',
      refreshSession: async () => null,
      onSessionExpired: () => {},
    })

    let received: string | null = 'ainda-nao-verificado'
    server.use(
      msw.post(`${BASE}/auth/login`, ({ request }) => {
        received = request.headers.get('Authorization')
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'b' })
      }),
    )

    await http.post('/auth/login', {}, { skipAuth: true })

    expect(received).toBeNull()
  })

  it('converte status de erro em HttpError preservando a mensagem da API', async () => {
    server.use(
      msw.get(`${BASE}/products/999`, () =>
        HttpResponse.json({ message: "Product with id '999' not found" }, { status: 404 }),
      ),
    )

    // `rejects` + matcher deixa claro o que esperamos: o tipo E o conteúdo.
    await expect(http.get('/products/999')).rejects.toBeInstanceOf(HttpError)

    // Recuperamos o erro para inspecionar os campos que a UI usa.
    const error = await http.get('/products/999').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(404)
    expect((error as HttpError).isNotFound).toBe(true)
    expect((error as HttpError).message).toBe("Product with id '999' not found")
  })

  it('converte falha de rede em NetworkError', async () => {
    server.use(msw.get(`${BASE}/products`, () => HttpResponse.error()))

    await expect(http.get('/products')).rejects.toBeInstanceOf(NetworkError)
  })

  it('renova a sessão e repete a requisição quando recebe 401', async () => {
    let currentToken = 'token-expirado'

    const refreshSession = vi.fn(async () => {
      currentToken = 'token-novo'
      return currentToken
    })

    restoreBridge = registerAuthBridge({
      getAccessToken: () => currentToken,
      refreshSession,
      onSessionExpired: () => {},
    })

    // O servidor só aceita o token novo: é o que força o fluxo de refresh.
    server.use(
      msw.get(`${BASE}/products`, ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer token-novo') {
          return HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 })
        }
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    const result = await http.get<{ total: number }>('/products')

    // O importante: a requisição foi bem-sucedida SEM o usuário perceber nada.
    expect(result.total).toBe(0)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('dispara apenas UM refresh quando várias requisições recebem 401 juntas', async () => {
    /**
     * Este teste protege contra um bug real e difícil de perceber: como a API
     * ROTACIONA o refresh token, dois refreshes simultâneos fariam o segundo
     * usar um token já invalidado — derrubando a sessão do usuário sem motivo.
     */
    let currentToken = 'token-expirado'

    const refreshSession = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      currentToken = 'token-novo'
      return currentToken
    })

    restoreBridge = registerAuthBridge({
      getAccessToken: () => currentToken,
      refreshSession,
      onSessionExpired: () => {},
    })

    server.use(
      msw.get(`${BASE}/products`, ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer token-novo') {
          return HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 })
        }
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    await Promise.all([http.get('/products'), http.get('/products'), http.get('/products')])

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('encerra a sessão quando o refresh falha', async () => {
    const onSessionExpired = vi.fn()

    restoreBridge = registerAuthBridge({
      getAccessToken: () => 'token-expirado',
      // Refresh token também inválido: não há como recuperar a sessão.
      refreshSession: async () => null,
      onSessionExpired,
    })

    server.use(
      msw.get(`${BASE}/products`, () =>
        HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 }),
      ),
    )

    await expect(http.get('/products')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('não tenta renovar indefinidamente se o 401 persistir após o refresh', async () => {
    const refreshSession = vi.fn(async () => 'token-novo-mas-inutil')
    const onSessionExpired = vi.fn()

    restoreBridge = registerAuthBridge({
      getAccessToken: () => 'qualquer',
      refreshSession,
      onSessionExpired,
    })

    // Responde 401 SEMPRE, mesmo com token novo.
    server.use(
      msw.get(`${BASE}/products`, () => HttpResponse.json({ message: 'nope' }, { status: 401 })),
    )

    await expect(http.get('/products')).rejects.toBeInstanceOf(SessionExpiredError)

    // Uma única tentativa de refresh: sem isso, seria um loop infinito.
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('monta a query string ignorando valores undefined', async () => {
    let requestUrl = ''
    server.use(
      msw.get(`${BASE}/products`, ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    await http.get('/products', {
      params: { limit: 12, skip: 0, q: undefined },
    })

    expect(requestUrl).toContain('limit=12')
    expect(requestUrl).toContain('skip=0')
    // O bug que isto evita: uma URL com "q=undefined" (a string!) faria a API
    // buscar literalmente por "undefined".
    expect(requestUrl).not.toContain('q=')
  })
})
