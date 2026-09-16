import { logger } from '@/lib/logger'

/**
 * Leitura das claims de um JWT — para EXIBIÇÃO e diagnóstico, nunca para
 * decisão de segurança.
 *
 * COMO UM JWT É FEITO: três partes separadas por ponto.
 *
 *   header.payload.signature
 *
 * `header` e `payload` são apenas JSON em Base64URL — NÃO são criptografados.
 * Qualquer pessoa cola o token em jwt.io e lê o conteúdo. Portanto nunca
 * coloque dado sensível nas claims.
 *
 * A `signature` é o que garante que o token não foi adulterado, e só pode ser
 * verificada por quem tem a chave secreta — ou seja, o SERVIDOR. Um frontend
 * decodificando o payload está apenas LENDO uma afirmação não verificada.
 *
 * Por isso a regra: usar as claims para melhorar a UX (mostrar nome, prever
 * expiração) é legítimo; confiar nelas para liberar acesso não é. Quem autoriza
 * é o backend, a cada requisição.
 *
 * Confirmado na DummyJSON: as claims trazem id, username, email, firstName,
 * lastName, gender, image, iat e exp — e NÃO trazem `role`. É mais um motivo
 * para buscarmos o papel em /auth/me em vez de deduzi-lo do token.
 */

export interface JwtClaims {
  /** Emitido em (issued at), em segundos desde 1970. */
  iat: number
  /** Expira em, em segundos desde 1970. */
  exp: number
  username?: string
}

/** Devolve null se o token for malformado — nunca lança. */
export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    // Base64URL troca "+/" por "-_" e remove o padding "=".
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))

    const claims: unknown = JSON.parse(json)
    if (typeof claims !== 'object' || claims === null) return null

    const { iat, exp } = claims as Record<string, unknown>
    if (typeof iat !== 'number' || typeof exp !== 'number') return null

    return claims as JwtClaims
  } catch (error) {
    logger.warn('Token JWT malformado', { error })
    return null
  }
}

/**
 * `exp` vem em SEGUNDOS; `Date.now()` em MILISSEGUNDOS. Confundir os dois é um
 * erro comum e silencioso (dá uma diferença de 1000x).
 */
export function getExpiresAt(token: string): Date | null {
  const claims = decodeJwtClaims(token)
  return claims ? new Date(claims.exp * 1000) : null
}
