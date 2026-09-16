/**
 * Ponte entre a camada HTTP (genérica) e a feature de autenticação (específica).
 *
 * PROBLEMA QUE ISTO RESOLVE — dependência circular:
 *   O cliente HTTP precisa do access token e precisa saber renovar a sessão.
 *   A feature `auth` precisa do cliente HTTP para chamar /auth/login.
 *   Se um importasse o outro diretamente: auth -> http -> auth. Circular.
 *
 * SOLUÇÃO — inversão de dependência:
 *   A camada HTTP declara aqui o que ela PRECISA (um contrato). Quem sabe
 *   cumprir esse contrato (o AuthProvider) se registra no boot. O `lib/http`
 *   nunca importa nada de `features/auth`; a seta aponta só num sentido.
 *
 * Isto é um módulo com estado global, o que normalmente evitamos. Aqui se
 * justifica: existe exatamente uma sessão por aba do navegador, e a alternativa
 * (passar o token por parâmetro em toda chamada de service) poluiria toda a
 * aplicação para resolver um problema que é, de fato, global.
 */

export interface AuthBridge {
  /** Access token atual, ou null se não houver sessão. */
  getAccessToken: () => string | null
  /**
   * Tenta renovar a sessão usando o refresh token.
   * Deve devolver o novo access token, ou null se não foi possível renovar.
   */
  refreshSession: () => Promise<string | null>
  /** Chamado quando a sessão é irrecuperável: o app deve deslogar o usuário. */
  onSessionExpired: () => void
}

// Implementação neutra: é o que vale antes de o AuthProvider montar (e em
// testes que não envolvem autenticação). Nunca é `null`, então o cliente HTTP
// não precisa checar existência a cada requisição.
const noopBridge: AuthBridge = {
  getAccessToken: () => null,
  refreshSession: async () => null,
  onSessionExpired: () => {},
}

let bridge: AuthBridge = noopBridge

/** Chamado uma vez pelo AuthProvider. Devolve a função de limpeza. */
export function registerAuthBridge(next: AuthBridge): () => void {
  bridge = next
  return () => {
    bridge = noopBridge
  }
}

export function getAuthBridge(): AuthBridge {
  return bridge
}
