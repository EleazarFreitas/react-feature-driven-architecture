import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { Alert } from '@/components/ui/Alert'

import { LoginForm } from '../components/LoginForm'
import { useAuthStore, useIsAuthenticated } from '../store/auth.store'

/**
 * Tela de login.
 *
 * Responsabilidades da PÁGINA (e não do formulário): layout, redirecionamentos
 * e o aviso de sessão expirada. O <LoginForm> só sabe coletar credenciais e
 * avisar que deu certo. Essa separação é o que permite reaproveitar o
 * formulário noutro lugar (um modal de "sessão expirou", por exemplo) sem
 * arrastar junto a lógica de navegação.
 */
export function LoginPage() {
  const isAuthenticated = useIsAuthenticated()
  const sessionExpired = useAuthStore((state) => state.sessionExpired)
  const navigate = useNavigate()
  const location = useLocation()

  /**
   * Para onde voltar depois de entrar.
   *
   * O <RequireAuth> guarda a rota que o usuário tentou abrir em `location.state`.
   * Assim, quem clicou num link direto para /products/5 sem sessão volta para
   * /products/5 depois do login — e não para uma home genérica.
   *
   * `state` é `unknown` no React Router: validamos o formato antes de usar, em
   * vez de confiar num `as`. O valor vem do histórico do navegador e pode ter
   * sido adulterado.
   */
  const fallbackTarget = ROUTES.products
  const state: unknown = location.state
  const redirectTo =
    typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string'
      ? state.from
      : fallbackTarget

  // Já logado (ex.: digitou /login na barra de endereços): não faz sentido
  // mostrar o formulário. `replace` evita que o botão "voltar" caia aqui de novo.
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

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {sessionExpired && (
            <div className="mb-4">
              <Alert variant="warning">
                Sua sessão expirou por inatividade. Entre novamente para continuar.
              </Alert>
            </div>
          )}

          <LoginForm onSuccess={() => navigate(redirectTo, { replace: true })} />
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
function DemoCredentials() {
  const accounts = [
    { username: 'emilys', password: 'emilyspass', role: 'Administrador — cria, edita e exclui' },
    { username: 'oliviaw', password: 'oliviawpass', role: 'Moderador — cria e edita, não exclui' },
    { username: 'averyp', password: 'averyppass', role: 'Somente leitura' },
  ]

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Contas de demonstração</h2>
      <p className="mt-1 text-xs text-slate-500">
        Contas públicas da API DummyJSON, usadas para demonstrar os papéis.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {accounts.map((account) => (
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
