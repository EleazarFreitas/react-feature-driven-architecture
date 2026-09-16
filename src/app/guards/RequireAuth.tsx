import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { useIsAuthenticated } from '@/features/auth/store/auth.store'

/**
 * Bloqueia rotas que exigem sessão.
 *
 * Usado como ROTA DE LAYOUT: em vez de embrulhar cada página numa guarda,
 * declaramos um nó de rota que renderiza <Outlet /> (os filhos) só quando há
 * sessão. Uma linha no router protege um ramo inteiro, e é impossível esquecer
 * de proteger uma página nova adicionada ali dentro.
 *
 * ⚠️ ISTO NÃO É SEGURANÇA. É navegação.
 * Todo este código roda no navegador do usuário, que pode alterá-lo à vontade.
 * A guarda evita que alguém veja telas quebradas pedindo dados que não pode ler
 * — nada além disso. Quem protege os DADOS é o backend, validando o token a
 * cada requisição. Se a API não recusar, esconder a tela não protege nada.
 */
export function RequireAuth() {
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        // Guarda o destino original para o login devolver o usuário para lá.
        // Inclui a query string: um filtro compartilhado por link é preservado.
        state={{ from: `${location.pathname}${location.search}` }}
        // `replace`: sem isso a rota bloqueada fica no histórico e o botão
        // "voltar" do navegador joga o usuário num pingue-pongue de redirects.
        replace
      />
    )
  }

  // Não precisamos tratar o estado "verificando sessão" aqui: o <AuthGate> só
  // renderiza a aplicação depois que o boot termina (ver features/auth/components).
  return <Outlet />
}
