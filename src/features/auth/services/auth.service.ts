import { z } from 'zod'

import { env } from '@/config/env'
import { http } from '@/lib/http/client'

import type { AuthTokens, AuthUser, LoginCredentials } from '../types/auth.types'

/**
 * Comunicação com os endpoints de autenticação da DummyJSON.
 *
 * A camada de service traduz "formato da API" para "formato da aplicação".
 * Assim, se a API mudar (ou for trocada por um backend próprio), o impacto
 * fica contido AQUI — nenhum componente conhece o formato cru da resposta.
 *
 * VALIDAÇÃO EM RUNTIME: uma anotação de tipo TypeScript é apagada no build e
 * não garante nada sobre o que chega pela rede. Nos endpoints de autenticação
 * validamos a resposta com Zod, porque um campo faltando aqui quebra o app
 * inteiro — e é muito melhor falhar com "resposta inesperada da API" do que
 * propagar `undefined` até um erro incompreensível três telas depois.
 */

const tokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})

// Os papéis são fechados; qualquer valor novo na API deve falhar de forma
// visível em vez de virar um papel desconhecido com permissões indefinidas.
const roleSchema = z.enum(['admin', 'moderator', 'user'])

const meResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
  role: roleSchema,
})

export const authService = {
  /**
   * POST /auth/login
   *
   * `skipAuth: true` porque é o endpoint que CRIA a sessão: mandar um
   * Authorization aqui não faz sentido e, se o token estiver expirado,
   * dispararia o fluxo de refresh no meio de um login.
   *
   * `expiresInMins` é um parâmetro real da DummyJSON. Deixá-lo configurável
   * permite baixar o TTL (ex.: 1 minuto) e ver o refresh automático acontecer.
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await http.post<unknown>(
      '/auth/login',
      { ...credentials, expiresInMins: env.VITE_ACCESS_TOKEN_TTL_MINUTES },
      { skipAuth: true },
    )

    return tokensSchema.parse(response)
  },

  /**
   * GET /auth/me — quem é o dono do access token atual.
   *
   * É a fonte da verdade do PAPEL do usuário, porque as claims do JWT da
   * DummyJSON não incluem `role` (ver services/jwt.ts).
   *
   * Também é o que usamos para restaurar a sessão depois de um F5: o token
   * está no storage, mas os dados do usuário não.
   */
  async getCurrentUser(): Promise<AuthUser> {
    const response = await http.get<unknown>('/auth/me')
    return meResponseSchema.parse(response)
  },

  /**
   * POST /auth/refresh — troca o refresh token por um novo par de tokens.
   *
   * A DummyJSON ROTACIONA o refresh token (devolve um novo a cada chamada), que
   * é o comportamento correto: um refresh token roubado tem janela de uso curta.
   * Por isso salvamos os DOIS tokens, não apenas o access token.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const response = await http.post<unknown>(
      '/auth/refresh',
      { refreshToken, expiresInMins: env.VITE_ACCESS_TOKEN_TTL_MINUTES },
      { skipAuth: true },
    )

    return tokensSchema.parse(response)
  },
}
