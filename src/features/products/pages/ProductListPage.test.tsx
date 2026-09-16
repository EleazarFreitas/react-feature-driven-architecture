import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { makeUser } from '@/test/fixtures'
import { server } from '@/test/server'
import { renderWithProviders, seedAuthenticatedSession } from '@/test/test-utils'

import { ProductListPage } from './ProductListPage'

const BASE = 'https://dummyjson.test'

/**
 * Testes da listagem: um por ESTADO DE INTERFACE.
 *
 * Cada estado é um caminho que o usuário realmente percorre, então cada um
 * merece um teste. É também a forma mais barata de garantir que ninguém
 * introduza a regressão clássica: exibir tela em branco quando a lista volta
 * vazia, ou deixar o spinner girando para sempre depois de um erro.
 */

/** Toda a listagem exige sessão; o papel muda quais ações aparecem. */
function renderList(route = '/products') {
  seedAuthenticatedSession()
  return renderWithProviders(<ProductListPage />, { route })
}

describe('ProductListPage', () => {
  it('mostra o carregamento e depois os produtos', async () => {
    renderList()

    // Buscamos pelo TEXTO, e não por role="status": o AuthProvider também
    // renderiza um "Verificando sessão..." com esse mesmo role enquanto valida
    // o token, e findByRole devolveria o primeiro que encontrasse.
    expect(await screen.findByText(/carregando produtos/i)).toBeInTheDocument()

    expect(await screen.findByText('Notebook Pro 14')).toBeInTheDocument()
    expect(screen.getByText('Mouse sem fio')).toBeInTheDocument()
  })

  it('mostra o estado vazio quando a busca não encontra nada', async () => {
    // O termo "inexistente" faz o handler devolver total 0 (ver test/handlers).
    renderList('/products?search=inexistente')

    expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument()

    // O estado vazio precisa oferecer uma SAÍDA, não apenas informar o vazio.
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeInTheDocument()
  })

  it('mostra o erro e permite tentar novamente', async () => {
    // Falha só na primeira vez: a segunda tentativa deve funcionar.
    server.use(
      http.get(
        `${BASE}/products`,
        () => HttpResponse.json({ message: 'Erro interno' }, { status: 500 }),
        { once: true },
      ),
    )

    const { user } = renderList()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/api está indisponível/i)

    // "Tentar novamente" aparece porque 500 é um erro que pode passar; num 404
    // o botão não seria oferecido (ver ErrorState/isRetryable).
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Notebook Pro 14')).toBeInTheDocument()
  })

  it('mostra a ação de criar para quem tem permissão', async () => {
    renderList()

    // Esperar os dados aparecerem é mais estável do que esperar o loading sumir:
    // o loading dos produtos só existe depois que a sessão é resolvida, então
    // ele pode ainda nem ter sido montado quando o teste começa a observar.
    await screen.findByText('Notebook Pro 14')

    // O handler padrão devolve um usuário admin.
    expect(screen.getByRole('link', { name: /novo produto/i })).toBeInTheDocument()
  })

  it('esconde a ação de criar de quem tem papel somente leitura', async () => {
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('user'))))

    renderList()

    await screen.findByText('Notebook Pro 14')

    // Autorização visível na interface. Vale lembrar: isto é UX. A proteção
    // real precisa estar no backend (ver permissions.ts).
    expect(screen.queryByRole('link', { name: /novo produto/i })).not.toBeInTheDocument()
  })

  it('lê os filtros da URL e os envia para a API', async () => {
    let requestUrl = ''

    server.use(
      http.get(`${BASE}/products/search`, ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    renderList('/products?search=notebook&sort=price-desc')

    await screen.findByText(/nenhum produto encontrado/i)

    // Confirma a tradução "estado da UI → parâmetros da API".
    expect(requestUrl).toContain('q=notebook')
    expect(requestUrl).toContain('sortBy=price')
    expect(requestUrl).toContain('order=desc')
  })
})
