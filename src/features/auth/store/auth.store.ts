import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

import { registerAuthBridge } from '@/lib/http/auth-bridge'
import { logger } from '@/lib/logger'

import { can, type Permission } from '../permissions'
import { authService } from '../services/auth.service'
import type { AuthStatus, AuthTokens, AuthUser, LoginCredentials } from '../types/auth.types'

/**
 * Sessão do usuário — store global em Zustand.
 *
 * POR QUE SAÍMOS DO CONTEXT API:
 * O Context resolvia bem a distribuição do valor, mas trazia três custos que só
 * aparecem quando o app cresce:
 *
 *   1. RE-RENDER EM BLOCO: todo consumidor de `useAuth()` re-renderizava quando
 *      QUALQUER campo mudava, porque o valor do Context é um objeto só. Com
 *      Zustand cada componente assina uma FATIA (`useAuthStore(s => s.user)`) e
 *      só re-renderiza quando aquela fatia muda;
 *   2. ESTADO PRESO À ÁRVORE: para ler a sessão fora de um componente (no
 *      cliente HTTP, por exemplo) era preciso guardar o valor num módulo à
 *      parte. Aqui `useAuthStore.getState()` funciona em qualquer lugar — é o
 *      que liga a store à camada HTTP no fim deste arquivo;
 *   3. PROVIDER + EFEITOS: a persistência do token era um service escrito à mão
 *      (`services/token-storage.ts`, agora removido). O middleware `persist` faz
 *      o mesmo, incluindo a leitura no boot, sem código nosso.
 *
 * O que NÃO mudou, de propósito: a máquina de estados `AuthStatus`, a decisão de
 * buscar o papel do usuário em /auth/me (o JWT da DummyJSON não traz `role`) e o
 * aviso de segurança sobre localStorage — ver types/auth.types.ts.
 *
 * ⚠️ PERSISTÊNCIA E SEGURANÇA: o `persist` grava em `localStorage`, legível por
 * qualquer JavaScript da página. Num backend próprio, o refresh token deveria
 * vir em cookie HttpOnly e o access token ficar só em memória. A DummyJSON
 * devolve os dois no corpo da resposta, então esta é a única opção disponível
 * aqui — e o middleware apenas centraliza o que já fazíamos à mão.
 */

interface AuthState {
  /** Dados do usuário logado, ou null. */
  user: AuthUser | null
  /** Máquina de estados da sessão — ver AuthStatus. */
  status: AuthStatus
  /** Único campo PERSISTIDO (ver `partialize` abaixo). */
  tokens: AuthTokens | null
  /** true quando a sessão caiu sozinha (token expirado e refresh falhou). */
  sessionExpired: boolean

  /** Lança em caso de credenciais inválidas — quem chama trata e exibe. */
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  /** Revalida o token persistido no boot. Idempotente — ver AuthGate. */
  restoreSession: () => Promise<void>
  /** Usada pelo cliente HTTP quando uma requisição recebe 401. */
  refreshSession: () => Promise<string | null>
  /** Sessão irrecuperável: desloga e sinaliza para a tela de login. */
  expireSession: () => void
  clearSession: () => void
}

const INITIAL_STATE = {
  user: null,
  status: 'unauthenticated',
  tokens: null,
  sessionExpired: false,
} satisfies Pick<AuthState, 'user' | 'status' | 'tokens' | 'sessionExpired'>

/**
 * Trava contra restaurações concorrentes. Precisa viver FORA do state: o
 * StrictMode monta o AuthGate duas vezes em desenvolvimento, e sem isto o
 * /auth/me seria chamado duas vezes a cada F5.
 */
let restoreInFlight: Promise<void> | null = null

/**
 * Adaptador de `localStorage` à prova de ambiente — a única parte do antigo
 * `services/token-storage.ts` que valia a pena manter.
 *
 * Duas razões para não entregar `window.localStorage` direto ao middleware:
 *   1. ele LANÇA EXCEÇÃO no modo privado de alguns navegadores e quando o
 *      usuário bloqueia storage. Um app que quebra inteiro por causa disso é
 *      pior do que um app que apenas não lembra a sessão;
 *   2. resolvemos `window.localStorage` a CADA chamada, e não uma vez na
 *      importação do módulo. Isso deixa o ambiente de teste livre para instalar
 *      o próprio storage (ver test/setup.ts) sem depender da ordem dos imports.
 */
const resilientStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name)
    } catch (error) {
      logger.warn('Não foi possível ler o localStorage', { name, error })
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
    } catch (error) {
      logger.warn('Não foi possível gravar no localStorage', { error })
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch (error) {
      logger.warn('Não foi possível limpar o localStorage', { error })
    }
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      login: async (credentials) => {
        const tokens = await authService.login(credentials)

        // Salvamos ANTES de buscar o perfil: é este set que faz o cliente HTTP
        // passar a enviar o header Authorization (ver a ponte no fim do arquivo).
        set({ tokens })

        try {
          // Segunda chamada obrigatória: /auth/login NÃO devolve o papel do
          // usuário, e sem o papel não decidimos o que ele pode fazer.
          const user = await authService.getCurrentUser()
          set({ user, status: 'authenticated', sessionExpired: false })
        } catch (error) {
          // Token salvo mas perfil não carregado = sessão pela metade.
          // Melhor desfazer tudo e deixar o usuário tentar de novo.
          set({ tokens: null })
          throw error
        }
      },

      logout: () => {
        // A DummyJSON não tem endpoint de logout. Num backend real, aqui entraria
        // um POST /auth/logout para REVOGAR o refresh token no servidor — sem
        // isso, um refresh token roubado continua valendo até expirar.
        get().clearSession()
      },

      restoreSession: () => {
        // `status` só nasce "loading" quando havia token persistido (ver `merge`).
        // Sem token não há o que restaurar, e evitamos um /auth/me garantidamente
        // 401.
        if (get().status !== 'loading') return Promise.resolve()

        restoreInFlight ??= authService
          .getCurrentUser()
          .then((user) => {
            set({ user, status: 'authenticated' })
          })
          .catch((error: unknown) => {
            // Token inválido/expirado sem refresh possível: começamos deslogados.
            // Não é um erro a mostrar, é o fim natural de uma sessão.
            logger.debug('Não foi possível restaurar a sessão', { error })
            get().clearSession()
          })
          .finally(() => {
            restoreInFlight = null
          })

        return restoreInFlight
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
        get().clearSession()
        set({ sessionExpired: true })
      },

      clearSession: () => {
        set({ user: null, tokens: null, status: 'unauthenticated' })
      },
    }),
    {
      name: 'catalogo.auth',
      version: 1,
      storage: createJSONStorage(() => resilientStorage),

      /**
       * Persistimos APENAS os tokens. O usuário é sempre rebuscado em /auth/me no
       * boot: guardar o `role` no navegador seria dar a um dado de autorização
       * uma cópia que o próprio usuário pode editar no DevTools. O `status`
       * também fica de fora — ele é recalculado no `merge`.
       */
      partialize: (state) => ({ tokens: state.tokens }),

      /**
       * A reidratação é SÍNCRONA (localStorage), então este merge roda antes do
       * primeiro render. É o que evita o bug clássico do F5: existir token e o
       * app renderizar por um instante como "deslogado", fazendo a rota
       * protegida chutar o usuário para o login.
       */
      merge: (persisted, current) => {
        const tokens = (persisted as { tokens?: AuthTokens | null } | null)?.tokens ?? null

        return {
          ...current,
          tokens,
          // Com token: "loading" até o /auth/me responder. Sem token: já sabemos.
          status: tokens ? 'loading' : 'unauthenticated',
        }
      },
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

export const useIsAuthenticated = () => useAuthStore((state) => state.status === 'authenticated')

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
 * Reinicia a store — usado pelos TESTES entre casos (ver test/setup.ts).
 * A store é um singleton de módulo: sem isto, o login de um teste vazaria para o
 * seguinte e os testes deixariam de ser reordenáveis.
 */
export function resetAuthStore(): void {
  restoreInFlight = null
  useAuthStore.setState(INITIAL_STATE)
}

/**
 * PONTE COM A CAMADA HTTP — registrada no escopo do módulo, não num efeito.
 *
 * Antes isso vivia num `useEffect` do AuthProvider, o que criava uma janela
 * (curta, mas real) em que uma requisição podia sair sem o header Authorization.
 * Como a store é um singleton que não depende da árvore React, o registro
 * acontece assim que este módulo é importado — ou seja, antes de qualquer
 * componente montar.
 *
 * A direção da dependência continua a mesma: `lib/http` declara o contrato e
 * nunca importa nada de `features/auth` (ver lib/http/auth-bridge.ts).
 */
registerAuthBridge({
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
  refreshSession: () => useAuthStore.getState().refreshSession(),
  onSessionExpired: () => {
    useAuthStore.getState().expireSession()
  },
})
