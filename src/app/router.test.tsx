import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { makeUser } from '@/test/fixtures'
import { server } from '@/test/server'
import { renderWithRouter, seedAuthenticatedSession } from '@/test/test-utils'

import { routes } from './router'

const BASE = 'https://dummyjson.test'

/**
 * Testes da TABELA DE ROTAS REAL.
 *
 * Por que este arquivo existe: os outros testes montam tabelas de rota
 * pequenas, feitas sob medida para o cenário. Isso é ótimo para isolar
 * comportamento, mas deixa um buraco — o `router.tsx` que roda em produção
 * nunca era exercitado. Um erro de digitação num path, um `lazy` apontando para
 * o export errado ou uma guarda no nível errado passariam despercebidos.
 *
 * É por isso que `routes` é exportado separado de `router`: aqui montamos a
 * MESMA árvore com `createMemoryRouter`, que funciona sem a API de histórico do
 * navegador.
 *
 * Todas as páginas são carregadas com `lazy`, então os testes usam `findBy*`
 * para esperar o import terminar.
 */
function renderApp(route: string) {
  // A MESMA tabela que roda em produção, montada pelo helper de teste — que
  // empilha os providers na mesma ordem do app/App.tsx.
  return renderWithRouter(routes, { route })
}

describe('tabela de rotas', () => {
  it('manda visitante sem sessão para o login', async () => {
    renderApp('/products')

    expect(await screen.findByRole('heading', { name: /catálogo admin/i })).toBeInTheDocument()
  })

  it('redireciona a raiz para a listagem de produtos', async () => {
    seedAuthenticatedSession()

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('carrega a página de detalhe com o id da URL', async () => {
    seedAuthenticatedSession()

    renderApp('/products/1')

    expect(await screen.findByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()
  })

  it('trata "new" como rota estática, e não como um id', async () => {
    // A pegadinha clássica: /products/new casando com /products/:id e a tela de
    // detalhe tentando buscar o produto de id "new".
    seedAuthenticatedSession()

    renderApp('/products/new')

    expect(await screen.findByRole('heading', { name: 'Novo produto' })).toBeInTheDocument()
  })

  it('leva ao 403 quem não tem permissão para criar', async () => {
    seedAuthenticatedSession()
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('user'))))

    renderApp('/products/new')

    expect(await screen.findByRole('heading', { name: /acesso negado/i })).toBeInTheDocument()
  })

  it('leva ao 403 o papel somente leitura que tenta a rota de edição', async () => {
    seedAuthenticatedSession()
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('user'))))

    renderApp('/products/1/edit')

    expect(await screen.findByRole('heading', { name: /acesso negado/i })).toBeInTheDocument()
  })

  it('mostra 404 para URL inexistente, mesmo sem sessão', async () => {
    // Fica fora do RequireAuth de propósito: quem digitou o endereço errado
    // deve ver "não existe", e não uma tela de login.
    renderApp('/rota-que-nao-existe')

    expect(
      await screen.findByRole('heading', { name: /página não encontrada/i }),
    ).toBeInTheDocument()
  })
})
