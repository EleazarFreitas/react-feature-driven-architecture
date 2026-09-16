import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { makeUser } from '@/test/fixtures'
import { server } from '@/test/server'
import { renderWithRouter, seedAuthenticatedSession } from '@/test/test-utils'

import { ProductDetailPage } from './ProductDetailPage'

const BASE = 'https://dummyjson.test'

/**
 * Testes do detalhe do produto.
 *
 * Cobrem o que a listagem não cobre: parâmetro de rota, ação destrutiva com
 * confirmação e a diferença entre um erro que permite nova tentativa (500) e um
 * que não permite (404).
 */

function renderDetail(route = '/products/1') {
  seedAuthenticatedSession()

  return renderWithRouter(
    [
      { path: '/products/:id', element: <ProductDetailPage /> },
      { path: '/products', element: <h1>Lista de produtos</h1> },
    ],
    { route },
  )
}

describe('ProductDetailPage', () => {
  it('carrega o produto usando o id da URL', async () => {
    renderDetail('/products/42')

    expect(await screen.findByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()

    // Confere a formatação de moeda e de percentual na tela real.
    expect(screen.getByText(/1\.299,99/)).toBeInTheDocument()
  })

  it('mostra erro sem "tentar novamente" quando o produto não existe', async () => {
    renderDetail('/products/999')

    expect(await screen.findByRole('alert')).toHaveTextContent(/não encontrado/i)

    // 404 não é recuperável: repetir daria o mesmo resultado. Oferecer o botão
    // seria enganar o usuário (ver isRetryable em lib/http/errors).
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('recusa um id que não é número sem chamar a API', async () => {
    // Se a requisição fosse feita, o MSW falharia o teste por rota inesperada.
    renderDetail('/products/abc')

    expect(await screen.findByRole('alert')).toHaveTextContent(/id válido/i)
  })

  it('pede confirmação antes de excluir e só então chama a API', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`${BASE}/products/:id`, () => {
        deleteCalled = true
        return HttpResponse.json({ id: 1, isDeleted: true })
      }),
    )

    const { user } = renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    // A exclusão NÃO pode acontecer só por clicar no botão da tela.
    expect(deleteCalled).toBe(false)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/tem certeza/i)

    // Confirma no diálogo. Usamos `within` porque existem DOIS botões
    // "Excluir" na tela agora: o da página e o do diálogo.
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    // Depois de excluir, volta para a lista com o aviso de que a API simula.
    expect(await screen.findByRole('heading', { name: /lista de produtos/i })).toBeInTheDocument()
    expect(deleteCalled).toBe(true)
  })

  it('não oferece exclusão ao moderador', async () => {
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('moderator'))))

    renderDetail()

    await screen.findByRole('heading', { name: 'Notebook Pro 14' })

    // Moderador edita, mas não exclui.
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('não oferece nenhuma ação de escrita ao papel somente leitura', async () => {
    server.use(http.get(`${BASE}/auth/me`, () => HttpResponse.json(makeUser('user'))))

    renderDetail()

    await screen.findByRole('heading', { name: 'Notebook Pro 14' })

    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('mostra o erro e mantém o usuário na página quando a exclusão falha', async () => {
    server.use(
      http.delete(`${BASE}/products/:id`, () =>
        HttpResponse.json({ message: 'Erro interno' }, { status: 500 }),
      ),
    )

    const { user } = renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )

    // Sem feedback, o usuário acharia que o clique não fez nada.
    expect(await screen.findByText(/api está indisponível/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /lista de produtos/i })).not.toBeInTheDocument()
  })
})
