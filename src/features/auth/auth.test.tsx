import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { RequireAuth } from '@/app/guards/RequireAuth'
import { RequirePermission } from '@/app/guards/RequirePermission'
import { makeUser } from '@/test/fixtures'
import { server } from '@/test/server'
import { renderWithRouter, seedAuthenticatedSession } from '@/test/test-utils'

import { LoginPage } from './pages/LoginPage'
import { useAuthStore } from './store/auth.store'

const BASE = 'https://dummyjson.test'

/**
 * Testes de INTEGRAÇÃO da autenticação.
 *
 * Integração (e não unitário) porque o que queremos garantir é o fluxo inteiro:
 * formulário → store Zustand → persistência do token → guarda de rota →
 * redirecionamento. Testar cada peça isolada deixaria passar exatamente os
 * bugs que aparecem na costura entre elas — que são os que realmente acontecem.
 *
 * Nenhum teste conhece detalhes internos: eles interagem como um usuário
 * (digitar, clicar) e verificam o que aparece na tela.
 */

/** Rotas mínimas para exercitar guarda + login + destino. */
function buildRoutes() {
  return [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        { path: '/products', element: <h1>Lista de produtos</h1> },
        {
          element: <RequirePermission permission="product:delete" />,
          children: [{ path: '/products/admin', element: <h1>Área restrita</h1> }],
        },
      ],
    },
    { path: '/403', element: <h1>Acesso negado</h1> },
  ]
}

describe('autenticação', () => {
  it('redireciona para o login quem tenta abrir uma rota protegida sem sessão', async () => {
    renderWithRouter(buildRoutes(), { route: '/products' })

    expect(await screen.findByRole('heading', { name: /catálogo admin/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /lista de produtos/i })).not.toBeInTheDocument()
  })

  it('faz login e leva o usuário à rota que ele tentou acessar', async () => {
    // Começamos em /products: a guarda deve guardar este destino e o login
    // devolver o usuário para cá — e não para uma home genérica.
    const { user } = renderWithRouter(buildRoutes(), { route: '/products' })

    await user.type(await screen.findByLabelText('Usuário'), 'emilys')
    await user.type(screen.getByLabelText('Senha'), 'emilyspass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('heading', { name: /lista de produtos/i })).toBeInTheDocument()
  })

  it('mostra mensagem de erro quando as credenciais são inválidas', async () => {
    const { user } = renderWithRouter(buildRoutes(), { route: '/login' })

    await user.type(await screen.findByLabelText('Usuário'), 'emilys')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    // A mensagem é genérica de propósito: não revelamos se o usuário existe.
    expect(await screen.findByRole('alert')).toHaveTextContent(/usuário ou senha inválidos/i)

    // E o usuário continua na tela de login.
    expect(screen.queryByRole('heading', { name: /lista de produtos/i })).not.toBeInTheDocument()
  })

  it('valida os campos obrigatórios antes de chamar a API', async () => {
    const { user } = renderWithRouter(buildRoutes(), { route: '/login' })

    // Envia o formulário vazio. Se a validação falhasse, o MSW acusaria uma
    // requisição inesperada (onUnhandledRequest: 'error') ou a API recusaria.
    await user.click(await screen.findByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Informe seu usuário')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()
  })

  it('restaura a sessão a partir do token salvo (simula um F5)', async () => {
    // Token já no storage, como ficaria depois de recarregar a página.
    seedAuthenticatedSession()

    renderWithRouter(buildRoutes(), { route: '/products' })

    // Não deve haver redirecionamento para o login: o <AuthGate> consulta
    // /auth/me e conclui que a sessão é válida.
    expect(await screen.findByRole('heading', { name: /lista de produtos/i })).toBeInTheDocument()
  })

  it('manda para o login quando o token salvo não é mais aceito', async () => {
    seedAuthenticatedSession()

    // Token inválido E refresh que também falha: sessão irrecuperável.
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 }),
      ),
    )

    renderWithRouter(buildRoutes(), { route: '/products' })

    expect(await screen.findByRole('heading', { name: /catálogo admin/i })).toBeInTheDocument()
  })

  it('bloqueia quem não tem a permissão exigida pela rota', async () => {
    seedAuthenticatedSession()

    // Usuário autenticado, porém com papel somente-leitura.
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('user'))))

    renderWithRouter(buildRoutes(), { route: '/products/admin' })

    // Vai para 403 (e não para o login): ele SABE quem é o usuário, só não
    // permite a ação. Mandar para o login aqui seria confuso.
    expect(await screen.findByRole('heading', { name: /acesso negado/i })).toBeInTheDocument()
  })

  it('permite o acesso a quem tem a permissão', async () => {
    seedAuthenticatedSession()
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('admin'))))

    renderWithRouter(buildRoutes(), { route: '/products/admin' })

    expect(await screen.findByRole('heading', { name: /área restrita/i })).toBeInTheDocument()
  })

  it('encerra a sessão no logout e volta a proteger as rotas', async () => {
    seedAuthenticatedSession()

    const routes = [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [{ path: '/products', element: <LogoutProbe /> }],
      },
    ]

    const { user } = renderWithRouter(routes, { route: '/products' })

    await user.click(await screen.findByRole('button', { name: /sair/i }))

    // Sem sessão, a guarda devolve o usuário ao login.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /catálogo admin/i })).toBeInTheDocument()
    })
  })
})

/** Componente mínimo só para disparar o logout dentro de uma rota protegida. */
function LogoutProbe() {
  const logout = useAuthStore((state) => state.logout)

  return <button onClick={logout}>Sair</button>
}
