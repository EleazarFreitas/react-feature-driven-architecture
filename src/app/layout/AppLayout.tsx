import { NavLink, Outlet } from 'react-router'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/paths'
import { ROLE_LABELS } from '@/features/auth/permissions'
import { useAuthStore, useCurrentUser } from '@/features/auth/store/auth.store'

/**
 * Moldura das telas autenticadas: cabeçalho, navegação e área de conteúdo.
 *
 * COMO UM LAYOUT FUNCIONA NO REACT ROUTER: ele é uma rota que não tem caminho
 * próprio e renderiza <Outlet />, o buraco onde a rota filha aparece. O
 * cabeçalho não é desmontado a cada navegação — só o conteúdo do <Outlet> troca.
 * Isso evita "piscar" o menu e preserva o estado dos componentes do layout.
 *
 * POR QUE MORA EM `app/` E NÃO EM `components/`: este layout conhece a sessão
 * (usuário, papel, logout), que é assunto de `features/auth`. Código
 * compartilhado de `components/` não pode importar de features; quem junta
 * features com a moldura da aplicação é a camada de composição.
 */
export function AppLayout() {
  const user = useCurrentUser()
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-screen bg-slate-50">
      {/*
        Link de pular para o conteúdo: fica invisível até receber foco. Para quem
        navega por teclado, é o que evita ter de passar por todo o menu em cada
        página. `sr-only` + `focus:not-sr-only` é o padrão para isso.
      */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="text-lg font-bold text-slate-900">Catálogo Admin</span>

          <nav aria-label="Principal" className="flex gap-1">
            <NavLink
              to={ROUTES.products}
              // NavLink dá o estado `isActive` de graça, calculado a partir da
              // URL atual — não precisamos controlar isso à mão.
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')
              }
            >
              Produtos
            </NavLink>
          </nav>

          {user && (
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user.firstName} {user.lastName}
                </p>
                {/* Mostrar o papel deixa a autorização visível: entre com
                    contas diferentes e veja os botões aparecerem e sumirem. */}
                <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
              </div>

              {/* Não há `navigate('/login')` aqui: ao limpar a store, o
                  <RequireAuth> re-renderiza e faz o redirecionamento. */}
              <Button variant="secondary" onClick={logout}>
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* <main> marca o conteúdo principal — é o alvo do link de pular acima. */}
      <main id="conteudo" className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
