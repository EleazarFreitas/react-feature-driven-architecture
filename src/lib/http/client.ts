import { env } from '@/config/env'
import { logger } from '@/lib/logger'

import { getAuthBridge } from './auth-bridge'
import { HttpError, NetworkError, SessionExpiredError } from './errors'

/**
 * Cliente HTTP da aplicação.
 *
 * POR QUE `fetch` E NÃO AXIOS?
 * O Axios é ótimo, mas resolve problemas que aqui ou não temos ou custam pouco:
 * interceptors (≈30 linhas abaixo), JSON automático (1 linha), erro em status
 * != 2xx (1 linha), baseURL (1 linha). O `fetch` é nativo — zero KB no bundle,
 * suporte nativo a `AbortSignal` (que usamos para cancelar requisições) e é a
 * API que você encontrará em qualquer ambiente JS moderno.
 *
 * Quando eu trocaria por Axios num projeto real: upload com progresso,
 * necessidade de timeout/retry declarativos complexos, ou suporte a navegadores
 * antigos. Nada disso se aplica aqui.
 *
 * A regra importante NÃO é "fetch vs Axios": é que a aplicação inteira passe
 * por UM ponto. Assim autenticação, tratamento de erro e refresh de token
 * existem em um lugar só, em vez de espalhados por dezenas de componentes.
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serializado como JSON automaticamente. */
  body?: unknown
  /** Query string. Valores `undefined` são omitidos — evita "?q=undefined". */
  params?: Record<string, string | number | boolean | undefined>
  /** Permite cancelar a requisição (ver lib/query/useQuery.ts). */
  signal?: AbortSignal
  /** Requisições públicas (ex.: login) não devem mandar Authorization. */
  skipAuth?: boolean
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${env.VITE_API_BASE_URL}${path}`)

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function parseBody(response: Response): Promise<unknown> {
  // 204 No Content não tem corpo; tentar .json() aí estouraria.
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return await response.text()
  }

  try {
    return await response.json()
  } catch {
    // JSON malformado: não deixamos o erro de parse mascarar o status HTTP.
    return null
  }
}

/** Extrai a mensagem de erro da API. A DummyJSON responde `{ "message": "..." }`. */
function extractApiMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body as { message: unknown }
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

/** Uma única ida à rede, sem nenhuma lógica de refresh. */
async function performRequest(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, params, signal, skipAuth } = options

  const headers = new Headers()
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  if (!skipAuth) {
    const token = getAuthBridge().getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    return await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // Um cancelamento deliberado não é falha de rede: propagamos como está
    // para que o chamador possa ignorá-lo (ver useQuery).
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new NetworkError(error)
  }
}

/**
 * Garante que N requisições que recebam 401 ao mesmo tempo disparem APENAS UM
 * refresh. Sem isto, uma tela com 3 requisições paralelas faria 3 refreshes
 * simultâneos — e como a DummyJSON rotaciona o refresh token, os dois últimos
 * usariam um token já invalidado e derrubariam a sessão.
 */
let refreshInFlight: Promise<string | null> | null = null

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= getAuthBridge()
    .refreshSession()
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

/**
 * Executa a requisição e, em caso de 401, tenta renovar a sessão UMA vez e
 * repetir. É o equivalente ao "response interceptor" do Axios.
 *
 * Por que só uma vez: se a requisição repetida também der 401, o problema não é
 * o token expirado — insistir viraria loop infinito.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await performRequest(path, options)

  if (response.status === 401 && !options.skipAuth) {
    logger.debug('401 recebido, tentando renovar a sessão', { path })
    const newToken = await refreshOnce()

    if (!newToken) {
      getAuthBridge().onSessionExpired()
      throw new SessionExpiredError()
    }

    response = await performRequest(path, options)

    if (response.status === 401) {
      getAuthBridge().onSessionExpired()
      throw new SessionExpiredError()
    }
  }

  const body = await parseBody(response)

  if (!response.ok) {
    const message = extractApiMessage(body, `Erro ${response.status} ao chamar ${path}`)
    logger.debug('Resposta HTTP com erro', { path, status: response.status, body })
    throw new HttpError(response.status, message, body)
  }

  // `as T` é uma asserção deliberada: a resposta de rede é `unknown` em tempo
  // de execução e nenhum tipo estático pode garantir seu formato. Os services
  // que precisam de garantia real validam o corpo com Zod (ver
  // features/products/services). Documentamos o formato esperado nos tipos.
  return body as T
}

/** Açúcar sintático para os verbos mais usados. */
export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
