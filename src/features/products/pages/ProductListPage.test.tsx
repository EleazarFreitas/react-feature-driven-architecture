import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { makeProduct } from '@/test/fixtures'
import { API_BASE } from '@/test/handlers'
import { server } from '@/test/server'
import { renderApp } from '@/test/test-utils'

/**
 * Listagem: os estados de interface que o usuário realmente percorre
 * (carregando → dados, vazio com saída, erro com nova tentativa), a busca de
 * ponta a ponta — campo → URL → parâmetros da API → tela — e a paginação.
 */

describe('listagem de produtos', () => {
  it('mostra o carregamento, depois os produtos e a ação de criar para o admin', async () => {
    renderApp('/products', { as: 'admin' })

    // Buscamos pelo TEXTO, e não por role="status": o "Carregando aplicação..."
    // do boot (sessão sendo restaurada) usa esse mesmo role.
    expect(await screen.findByText(/carregando produtos/i)).toBeInTheDocument()

    expect(await screen.findByText('Notebook Pro 14')).toBeInTheDocument()
    expect(screen.getByText('Mouse sem fio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /novo produto/i })).toBeInTheDocument()
  })

  it('esconde a ação de criar do papel somente leitura', async () => {
    renderApp('/products', { as: 'user' })

    await screen.findByText('Notebook Pro 14')

    // Autorização visível na interface. Isto é UX: a proteção real precisa
    // estar no backend (ver permissions.ts).
    expect(screen.queryByRole('link', { name: /novo produto/i })).not.toBeInTheDocument()
  })

  it('busca pelo termo digitado, mostra o vazio e volta ao catálogo em "Limpar filtros"', async () => {
    const searches: URL[] = []
    server.use(
      http.get(`${API_BASE}/products/search`, ({ request }) => {
        searches.push(new URL(request.url))
        return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
      }),
    )

    // A ordenação vem da URL (link compartilhado) e precisa chegar à busca.
    const { user } = renderApp('/products?sort=price-desc', { as: 'admin' })
    await screen.findByText('Notebook Pro 14')

    await user.type(screen.getByLabelText('Buscar'), 'teclado')

    // O termo só vira requisição depois do debounce; o estado vazio precisa
    // oferecer uma SAÍDA, não apenas informar que não há nada.
    expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument()
    // Uma única requisição (sem o debounce, seria uma por tecla), já com a
    // tradução "estado da UI → parâmetros da API".
    expect(searches.map((url) => Object.fromEntries(url.searchParams))).toEqual([
      expect.objectContaining({ q: 'teclado', sortBy: 'price', order: 'desc' }),
    ])

    await user.click(screen.getByRole('button', { name: /limpar filtros/i }))

    expect(await screen.findByText('Notebook Pro 14')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
  })

  it('pagina traduzindo "página" da interface para "skip" da API', async () => {
    const requests: URL[] = []
    server.use(
      http.get(`${API_BASE}/products`, ({ request }) => {
        const url = new URL(request.url)
        requests.push(url)
        const skip = Number(url.searchParams.get('skip'))
        return HttpResponse.json({
          // O título muda por página para o teste saber qual delas está na tela.
          products: [makeProduct({ id: skip + 1, title: `Produto ${skip + 1}` })],
          total: 30,
          skip,
          limit: 12,
        })
      }),
    )

    const { user } = renderApp('/products', { as: 'admin' })

    // 30 itens em páginas de 12 = 3 páginas: `total` é o total no SERVIDOR.
    expect(await screen.findByText('Produto 1')).toBeInTheDocument()
    // O texto está dividido em vários elementos (<strong>), então conferimos o
    // conteúdo da região de paginação em vez de procurar a frase inteira.
    const pagination = screen.getByRole('navigation', { name: 'Paginação' })
    expect(pagination).toHaveTextContent('Página 1 de 3')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    // Página 2 = pular os 12 primeiros.
    expect(await screen.findByText('Produto 13')).toBeInTheDocument()
    expect(pagination).toHaveTextContent('Página 2 de 3')
    expect(requests.map((url) => url.searchParams.get('skip'))).toEqual(['0', '12'])
  })

  it('mostra o erro e permite tentar novamente', async () => {
    // Falha só na primeira vez: a segunda tentativa deve funcionar.
    server.use(
      http.get(
        `${API_BASE}/products`,
        () => HttpResponse.json({ message: 'Erro interno' }, { status: 500 }),
        { once: true },
      ),
    )

    const { user } = renderApp('/products', { as: 'admin' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/api está indisponível/i)

    // "Tentar novamente" aparece porque 500 pode passar; num 404 o botão não
    // seria oferecido (ver ErrorState/isRetryable).
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Notebook Pro 14')).toBeInTheDocument()
  })
})
