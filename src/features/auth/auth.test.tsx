import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_BASE } from '@/test/handlers'
import { server } from '@/test/server'
import { renderApp } from '@/test/test-utils'

/**
 * Testes de INTEGRAÇÃO da autenticação e das guardas de rota.
 *
 * Montam a aplicação real (tabela de rotas de app/router.tsx, guardas, layout)
 * e só trocam o servidor pelo MSW. O que queremos garantir é o fluxo inteiro:
 * formulário → store → persistência do token → guarda → redirecionamento.
 * Testar cada peça isolada deixaria passar os bugs que aparecem na costura
 * entre elas — que são os que realmente acontecem.
 */

const loginHeading = () => screen.findByRole('heading', { name: /catálogo admin/i })

describe('login', () => {
  it('leva o visitante ao login e, depois de entrar, à rota que ele tentou abrir', async () => {
    // Destino diferente do padrão (/products): prova que a guarda guardou a
    // rota pedida, e não que o login manda sempre para a mesma home.
    const { user } = renderApp('/products/1')

    await user.type(await screen.findByLabelText('Usuário'), 'emilys')
    await user.type(screen.getByLabelText('Senha'), 'emilyspass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()
  })

  it('valida os campos e recusa credenciais inválidas sem sair do login', async () => {
    // Só observa: sem retorno, o MSW segue para o handler padrão de /auth/login.
    let loginRequests = 0
    server.use(
      http.post(`${API_BASE}/auth/login`, () => {
        loginRequests += 1
      }),
    )

    const { user } = renderApp('/login')

    await user.click(await screen.findByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Informe seu usuário')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Usuário'), 'emilys')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    // A mensagem é genérica de propósito: não revelamos se o usuário existe.
    expect(await screen.findByText(/usuário ou senha inválidos/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /catálogo admin/i })).toBeInTheDocument()
    // Uma requisição só: o envio vazio foi barrado pela validação, antes da API.
    expect(loginRequests).toBe(1)
  })
})

describe('sessão', () => {
  it('restaura a sessão salva (F5) e a encerra no logout', async () => {
    // A raiz não tem tela própria: com sessão válida, vai para a listagem.
    const { user } = renderApp('/', { as: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await loginHeading()).toBeInTheDocument()
  })

  it('volta ao login com aviso quando o token salvo expirou e o refresh falha', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ message: 'Invalid/Expired Token!' }, { status: 401 }),
      ),
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 }),
      ),
    )

    renderApp('/products', { as: 'admin' })

    expect(await loginHeading()).toBeInTheDocument()
    // Sem o aviso, o usuário acharia que foi deslogado por um bug.
    expect(screen.getByText(/sua sessão expirou/i)).toBeInTheDocument()
  })
})

describe('guardas de rota', () => {
  it.each(['/products/new', '/products/1/edit'])(
    'leva ao 403 (e não ao login) o papel somente leitura que abre %s',
    async (route) => {
      // Ele SABE quem é o usuário, só não permite a ação. Mandar para o login
      // aqui seria confuso.
      renderApp(route, { as: 'user' })

      expect(await screen.findByRole('heading', { name: /acesso negado/i })).toBeInTheDocument()
    },
  )

  it('mostra 404 para URL inexistente, mesmo sem sessão', async () => {
    // Fica fora do RequireAuth de propósito: quem digitou o endereço errado
    // deve ver "não existe", e não uma tela de login.
    renderApp('/rota-que-nao-existe')

    expect(
      await screen.findByRole('heading', { name: /página não encontrada/i }),
    ).toBeInTheDocument()
  })
})
