import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_BASE } from '@/test/handlers'
import { server } from '@/test/server'
import { renderApp } from '@/test/test-utils'

/**
 * Detalhe do produto: parâmetro de rota, ações por papel e a exclusão com
 * confirmação — incluindo a volta para a listagem REAL com o aviso.
 */

describe('detalhe do produto', () => {
  it('carrega o produto usando o id da URL', async () => {
    renderApp('/products/42', { as: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()
    // Formatação de moeda na tela real.
    expect(screen.getByText(/1\.299,99/)).toBeInTheDocument()
  })

  it.each([
    // 404 não é recuperável: repetir daria o mesmo resultado, então oferecer
    // "tentar novamente" seria enganar o usuário (ver isRetryable).
    { route: '/products/999', message: /não encontrado/i },
    // Id inválido nem chega à API — se chegasse, o MSW falharia o teste por
    // requisição sem handler.
    { route: '/products/abc', message: /id válido/i },
  ])('mostra erro sem "tentar novamente" em $route', async ({ route, message }) => {
    renderApp(route, { as: 'admin' })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it.each([
    { as: 'moderator', canEdit: true },
    { as: 'user', canEdit: false },
  ] as const)('só oferece as ações permitidas ao papel $as', async ({ as, canEdit }) => {
    renderApp('/products/1', { as })

    await screen.findByRole('heading', { name: 'Notebook Pro 14' })

    // Exclusão é só do admin: o moderador edita, o somente leitura nem isso.
    expect(screen.queryAllByRole('link', { name: 'Editar' })).toHaveLength(canEdit ? 1 : 0)
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('pede confirmação antes de excluir e volta para a lista com o aviso', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`${API_BASE}/products/:id`, () => {
        deleteCalled = true
        return HttpResponse.json({ id: 1, isDeleted: true })
      }),
    )

    const { user } = renderApp('/products/1', { as: 'admin' })

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    // A exclusão NÃO pode acontecer só por clicar no botão da tela.
    expect(deleteCalled).toBe(false)

    // `within`: agora há DOIS botões "Excluir" — o da página e o do diálogo.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/tem certeza/i)
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument()
    expect(screen.getByText(/exclusão enviada com sucesso/i)).toBeInTheDocument()
    expect(deleteCalled).toBe(true)
  })

  it('mostra o erro e mantém o usuário na página quando a exclusão falha', async () => {
    server.use(
      http.delete(`${API_BASE}/products/:id`, () =>
        HttpResponse.json({ message: 'Erro interno' }, { status: 500 }),
      ),
    )

    const { user } = renderApp('/products/1', { as: 'admin' })

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )

    // Sem feedback, o usuário acharia que o clique não fez nada.
    expect(await screen.findByText(/api está indisponível/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()
  })
})
