import { Navigate, useLocation } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { ROUTES } from '@/config/paths'

import { LoginForm } from '../components/LoginForm'
import { useAuthStore, useIsAuthenticated } from '../store/auth.store'

/**
 * Tela de login.
 *
 * Responsabilidades da PÁGINA (e não do formulário): layout, o redirecionamento
 * e o aviso de sessão expirada. O <LoginForm> só sabe coletar credenciais e
 * chamar o login.
 */
export function LoginPage() {
  const isAuthenticated = useIsAuthenticated()
  const sessionExpired = useAuthStore((state) => state.sessionExpired)
  const location = useLocation()

  /**
   * Para onde ir depois de entrar.
   *
   * O <RequireAuth> guarda a rota que o usuário tentou abrir em `location.state`.
   * Assim, quem clicou num link direto para /products/5 sem sessão volta para
   * /products/5 depois do login — e não para uma home genérica.
   *
   * `state` é `unknown` para nós: validamos o formato antes de usar, em vez de
   * confiar num `as`. O valor vem do histórico do navegador, e qualquer código
   * que navegue até aqui pode ter colocado outra coisa lá.
   */
  const state: unknown = location.state
  const redirectTo =
    typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string'
      ? state.from
      : ROUTES.products

  // Um único redirecionamento cobre os dois casos: quem ACABOU de entrar (a
  // store ganhou um usuário e esta página re-renderizou) e quem já estava
  // logado e digitou /login na barra de endereços. `replace` evita que o botão
  // "voltar" caia no login de novo.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Catálogo Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para gerenciar os produtos</p>
        </header>

        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {sessionExpired && (
            <Alert variant="warning">Sua sessão expirou. Entre novamente para continuar.</Alert>
          )}

          <LoginForm />
        </div>

        <DemoCredentials />
      </div>
    </main>
  )
}

/**
 * Sem isto o projeto é inutilizável: ninguém adivinha um usuário válido da
 * DummyJSON. Estas contas são públicas e documentadas pela própria API — não há
 * segredo nenhum sendo exposto aqui.
 *
 * Os três papéis existem para você ver a AUTORIZAÇÃO funcionando: entre como
 * `averyp` e repare que os botões de criar/editar/excluir somem.
 */
const DEMO_ACCOUNTS = [
  { username: 'emilys', password: 'emilyspass', role: 'Administrador — cria, edita e exclui' },
  { username: 'oliviaw', password: 'oliviawpass', role: 'Moderador — cria e edita, não exclui' },
  { username: 'averyp', password: 'averyppass', role: 'Somente leitura' },
]

function DemoCredentials() {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Contas de demonstração</h2>
      <p className="mt-1 text-xs text-slate-500">
        Contas públicas da API DummyJSON, usadas para demonstrar os papéis.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.username} className="text-xs">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
              {account.username} / {account.password}
            </code>
            <span className="mt-0.5 block text-slate-500">{account.role}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
