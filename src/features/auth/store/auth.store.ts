import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { registerAuthBridge } from '@/lib/http/auth-bridge'
import { logger } from '@/lib/logger'

import { can, type Permission } from '../permissions'
import { authService } from '../services/auth.service'
import type { AuthTokens, AuthUser, LoginCredentials } from '../types/auth.types'

/**
 * Sessão do usuário — store global em Zustand.
 *
 * POR QUE A SESSÃO VIVE NUMA STORE ZUSTAND (e não num Context):
 *
 *   1. RE-RENDER POR FATIA: cada componente assina uma FATIA específica
 *      (`useAuthStore(s => s.user)`) e só re-renderiza quando aquela fatia
 *      muda, não quando qualquer campo da sessão muda;
 *   2. ESTADO ACESSÍVEL FORA DA ÁRVORE: `useAuthStore.getState()` funciona em
 *      qualquer lugar, inclusive fora de componentes — é o que o loader da
 *      rota raiz e a camada HTTP usam (ver o fim deste arquivo);
 *   3. PERSISTÊNCIA DECLARATIVA: o middleware `persist` salva e reidrata os
 *      tokens sem código adicional.
 *
 * O ESTADO É MÍNIMO de propósito. Não existe um `isAuthenticated` guardado:
 * "estar logado" é o mesmo que "há um usuário", então é um valor DERIVADO
 * (ver `useIsAuthenticated`). Guardar os dois abriria espaço para divergirem.
 *
 * ⚠️ PERSISTÊNCIA E SEGURANÇA: o `persist` grava em `localStorage`, legível por
 * qualquer JavaScript da página. Num backend próprio, o refresh token deveria
 * vir em cookie HttpOnly e o access token ficar só em memória. A DummyJSON
 * devolve os dois no corpo da resposta, então esta é a única opção disponível
 * aqui (ver docs.md > JWT).
 */

interface AuthState {
  /** Dados do usuário logado, ou null. Nunca é persistido. */
  user: AuthUser | null
  /** Único campo PERSISTIDO (ver `partialize` abaixo). */
  tokens: AuthTokens | null
  /** true quando a sessão caiu sozinha (token expirado e refresh falhou). */
  sessionExpired: boolean

  /** Lança em caso de credenciais inválidas — quem chama trata e exibe. */
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  /** Descobre de quem é o token salvo. Chamada no boot (ver app/router.tsx). */
  restoreSession: () => Promise<void>
  /** Usada pelo cliente HTTP quando uma requisição recebe 401. */
  refreshSession: () => Promise<string | null>
  /** Sessão irrecuperável: desloga e sinaliza para a tela de login. */
  expireSession: () => void
}

const SIGNED_OUT = { user: null, tokens: null } satisfies Partial<AuthState>

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...SIGNED_OUT,
      sessionExpired: false,

      login: async (credentials) => {
        const tokens = await authService.login(credentials)

        // Salvamos ANTES de buscar o perfil: é este set que faz o cliente HTTP
        // passar a enviar o header Authorization (ver a ponte no fim do arquivo).
        set({ tokens })

        try {
          // Segunda chamada obrigatória: /auth/login NÃO devolve o papel do
          // usuário, e sem o papel não decidimos o que ele pode fazer.
          const user = await authService.getCurrentUser()
          set({ user, sessionExpired: false })
        } catch (error) {
          // Token salvo mas perfil não carregado = sessão pela metade.
          // Melhor desfazer tudo e deixar o usuário tentar de novo.
          set(SIGNED_OUT)
          throw error
        }
      },

      logout: () => {
        // A DummyJSON não tem endpoint de logout. Num backend real, aqui entraria
        // um POST /auth/logout para REVOGAR o refresh token no servidor — sem
        // isso, um refresh token roubado continua valendo até expirar.
        set({ ...SIGNED_OUT, sessionExpired: false })
      },

      restoreSession: async () => {
        // Só há o que restaurar quando o `persist` trouxe um token de uma visita
        // anterior e ainda não sabemos de quem ele é. Sem token, evitamos um
        // /auth/me que responderia 401 com certeza.
        if (get().tokens === null || get().user !== null) return

        try {
          const user = await authService.getCurrentUser()
          set({ user })
        } catch (error) {
          /**
           * Qualquer falha encerra a sessão, e o usuário começa no login.
           *
           * É a política mais simples e nunca deixa o app preso numa tela de
           * erro. O custo: uma queda de rede bem na hora do F5 também desloga.
           * Com um backend próprio valeria separar os casos — token recusado
           * (401) desloga; rede ou 5xx mantém o token e oferece "tentar de
           * novo". Aqui não dá: a DummyJSON responde 500 para token malformado,
           * então os dois casos são indistinguíveis.
           *
           * Se o motivo foi token expirado sem refresh possível, o cliente HTTP
           * já chamou `expireSession` — e o aviso `sessionExpired` permanece.
           */
          logger.debug('Não foi possível restaurar a sessão', { error })
          set(SIGNED_OUT)
        }
      },

      refreshSession: async () => {
        const refreshToken = get().tokens?.refreshToken
        if (!refreshToken) return null

        try {
          const tokens = await authService.refresh(refreshToken)
          // A DummyJSON ROTACIONA o refresh token: salvamos os DOIS.
          set({ tokens })
          logger.debug('Sessão renovada com sucesso')
          return tokens.accessToken
        } catch (error) {
          logger.debug('Refresh token inválido ou expirado', { error })
          return null
        }
      },

      expireSession: () => {
        set({ ...SIGNED_OUT, sessionExpired: true })
      },
    }),
    {
      name: 'catalogo.auth',

      // Versão do FORMATO salvo. Se um dia ele mudar, incremente e escreva um
      // `migrate`; sem isso o `persist` descarta o que foi salvo com outra
      // versão (o usuário só precisa entrar de novo).
      version: 1,

      // `localStorage` já é o padrão do `persist`; fica explícito porque é a
      // decisão de segurança mais importante deste arquivo. A leitura é
      // SÍNCRONA: quando este módulo termina de carregar, os tokens salvos já
      // estão na store.
      storage: createJSONStorage(() => localStorage),

      /**
       * Persistimos APENAS os tokens. O usuário é sempre rebuscado em /auth/me
       * no boot: guardar o `role` no navegador seria dar a um dado de
       * autorização uma cópia que o próprio usuário pode editar no DevTools.
       */
      partialize: (state) => ({ tokens: state.tokens }),
    },
  ),
)

/**
 * SELETORES PRONTOS.
 *
 * Existem para que os componentes não repitam o seletor (e não errem a fatia):
 * cada hook devolve um primitivo ou uma referência estável, então o componente
 * só re-renderiza quando AQUELE valor muda.
 */
export const useCurrentUser = () => useAuthStore((state) => state.user)

/** Estado derivado: "logado" é exatamente "tem usuário". */
export const useIsAuthenticated = () => useAuthStore((state) => state.user !== null)

/**
 * Autorização em forma de hook. A regra continua morando em `permissions.ts`
 * (função pura, testável sem React); aqui só a ligamos ao usuário da store.
 *
 * ⚠️ Vale o aviso de sempre: isto é UX, não segurança. Quem recusa a operação
 * precisa ser o backend.
 */
export const useHasPermission = (permission: Permission) =>
  useAuthStore((state) => can(state.user, permission))

/**
 * PONTE COM A CAMADA HTTP — registrada no escopo do módulo, não num efeito.
 *
 * Como a store é um singleton que não depende da árvore React, o registro
 * acontece assim que este módulo é importado — ou seja, antes de qualquer
 * requisição sair. Isso evita a janela (curta, mas real) em que uma chamada
 * poderia ir sem o header Authorization.
 *
 * A direção da dependência continua a mesma: `lib/http` declara o contrato e
 * nunca importa nada de `features/auth` (ver lib/http/auth-bridge.ts).
 */
registerAuthBridge({
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
  refreshSession: () => useAuthStore.getState().refreshSession(),
  onSessionExpired: () => useAuthStore.getState().expireSession(),
})
