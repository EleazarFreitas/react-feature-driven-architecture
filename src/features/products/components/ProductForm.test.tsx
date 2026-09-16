import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/test/server'

import { ProductForm } from './ProductForm'

/**
 * Testes do formulário.
 *
 * Não precisam de Provider nem de rede: o <ProductForm> recebe tudo por props.
 * Essa é uma vantagem concreta de separar "quem apresenta" de "quem chama a
 * API" — o teste fica rápido, direto e sem preparação.
 *
 * O que vale testar num formulário: as REGRAS (o que é recusado e o que passa)
 * e o contrato com quem o usa (o que chega no onSubmit). Não testamos que
 * "digitar altera o valor do input" — isso é o React/RHF funcionando, não o
 * nosso código.
 */

const CATEGORIES = ['laptops', 'smartphones']

function renderForm(overrides: Partial<Parameters<typeof ProductForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()

  render(
    <ProductForm
      categories={CATEGORIES}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={false}
      submitError={null}
      submitLabel="Salvar"
      {...overrides}
    />,
  )

  return { onSubmit, onCancel, user: userEvent.setup() }
}

const VALID_VALUES = {
  title: 'Teclado mecânico',
  description: 'Teclado mecânico com switches azuis e teclado numérico.',
  category: 'laptops',
  price: 199.9,
  stock: 10,
  discountPercentage: 5,
}

describe('ProductForm', () => {
  it('não envia e mostra os erros quando o formulário está vazio', async () => {
    const { onSubmit, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/título precisa ter ao menos 3 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/descrição precisa ter ao menos 10 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText('Selecione uma categoria')).toBeInTheDocument()

    // O mais importante: a API não foi chamada com dados inválidos.
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mostra mensagem clara quando o preço fica em branco', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    // Campo numérico vazio vira NaN; sem uma mensagem própria, o usuário veria
    // um erro técnico do tipo "expected number, received nan".
    expect(await screen.findByText('Informe um preço válido')).toBeInTheDocument()
  })

  it('recusa preço negativo', async () => {
    const { onSubmit, user } = renderForm()

    await user.type(screen.getByLabelText('Título'), VALID_VALUES.title)
    await user.type(screen.getByLabelText('Descrição'), VALID_VALUES.description)
    await user.selectOptions(screen.getByLabelText('Categoria'), 'laptops')
    await user.type(screen.getByLabelText('Preço (USD)'), '-5')
    await user.type(screen.getByLabelText('Estoque'), '10')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O preço precisa ser maior que zero')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia os valores já convertidos para número quando tudo é válido', async () => {
    const { onSubmit, user } = renderForm()

    await user.type(screen.getByLabelText('Título'), VALID_VALUES.title)
    await user.type(screen.getByLabelText('Descrição'), VALID_VALUES.description)
    await user.selectOptions(screen.getByLabelText('Categoria'), 'laptops')
    await user.type(screen.getByLabelText('Preço (USD)'), '199.9')
    await user.type(screen.getByLabelText('Estoque'), '10')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    // `price` precisa chegar como número 199.9, e não como a string "199.9" —
    // é o que `valueAsNumber` garante. Mandar string faria a API recusar.
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: VALID_VALUES.title,
      category: 'laptops',
      price: 199.9,
      stock: 10,
    })
  })

  it('preenche os campos com os valores iniciais na edição', () => {
    renderForm({ defaultValues: VALID_VALUES })

    expect(screen.getByLabelText('Título')).toHaveValue(VALID_VALUES.title)
    expect(screen.getByLabelText('Preço (USD)')).toHaveValue(VALID_VALUES.price)
  })

  it('desabilita o envio enquanto a requisição está em andamento', () => {
    renderForm({ isSubmitting: true })

    // Trava contra clique duplo — o outro lado da trava está na página, que
    // ignora o submit enquanto `isPending` estiver ativo.
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('exibe o erro vindo da API sem apagar o que o usuário digitou', async () => {
    const { user } = renderForm({
      defaultValues: VALID_VALUES,
      submitError: new Error('A API recusou a requisição'),
    })

    expect(screen.getByRole('alert')).toHaveTextContent('A API recusou a requisição')

    // O dado digitado continua na tela: perder o preenchimento por causa de uma
    // falha de rede é das piores experiências possíveis.
    expect(screen.getByLabelText('Título')).toHaveValue(VALID_VALUES.title)

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
  })

  it('bloqueia o envio enquanto a imagem ainda está subindo', async () => {
    /**
     * Sem esta trava, dá para clicar em "Salvar" com a imagem no meio do envio
     * — e o produto seria criado sem a thumbnail, enquanto o usuário juraria
     * que anexou a foto.
     */
    // Sem atrasar a resposta, o upload termina antes de conseguirmos observar
    // o estado intermediário — e o teste viraria uma corrida instável.
    server.use(
      http.post('https://upload.test/api/v1/files/upload', async () => {
        await delay(100)
        return HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc123.png',
          location: 'https://upload.test/api/v1/files/abc123.png',
        })
      }),
    )

    const { user } = renderForm({ defaultValues: VALID_VALUES })

    const salvar = screen.getByRole('button', { name: 'Salvar' })
    expect(salvar).toBeEnabled()

    await user.upload(
      screen.getByLabelText(/imagem do produto/i),
      new File([new Uint8Array(1000)], 'foto.png', { type: 'image/png' }),
    )

    // Durante o envio o botão fica bloqueado e o motivo aparece na tela...
    await waitFor(() => expect(salvar).toBeDisabled())
    expect(screen.getByText(/aguarde o envio da imagem/i)).toBeInTheDocument()

    // ...e volta a liberar quando termina.
    await waitFor(() => expect(salvar).toBeEnabled())
  })

  it('associa a mensagem de erro ao campo para leitores de tela', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText(/título precisa ter ao menos 3 caracteres/i)

    const titleInput = screen.getByLabelText('Título')

    // aria-invalid + aria-describedby são o que faz o leitor de tela anunciar
    // "inválido" E o motivo. Sem isso a pessoa só ouve o nome do campo.
    expect(titleInput).toHaveAttribute('aria-invalid', 'true')
    expect(titleInput).toHaveAccessibleDescription(/título precisa ter ao menos 3 caracteres/i)
  })
})
