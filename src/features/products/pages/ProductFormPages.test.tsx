import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_BASE, UPLOAD_BASE } from '@/test/handlers'
import { server } from '@/test/server'
import { objectUrlTracker } from '@/test/polyfills'
import { renderApp } from '@/test/test-utils'

/**
 * Criar e editar produto, de ponta a ponta.
 *
 * O formulário (<ProductForm>) e o campo de imagem (<ProductImageField>) são
 * exercitados PELAS PÁGINAS que os usam: validação → upload → envio → navegação.
 * Testá-los isolados, via props e `vi.fn()`, confirmaria o contrato entre
 * componentes — um detalhe de implementação — e deixaria a costura com a API
 * e com o roteador sem cobertura.
 */

const UPLOADED_URL = `${UPLOAD_BASE}/files/abc123.png`

function makeFile(name: string, type: string, sizeInBytes: number): File {
  return new File([new Uint8Array(sizeInBytes)], name, { type })
}

const imageInput = () => screen.getByLabelText(/imagem do produto/i)

/** Registra o corpo de cada escrita que chega à API. */
function captureWrites(method: 'post' | 'put', path: string) {
  const bodies: unknown[] = []
  server.use(
    http[method](`${API_BASE}${path}`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      return HttpResponse.json({ ...body, id: 195 }, { status: 201 })
    }),
  )
  return bodies
}

async function fillValidProduct(user: UserEvent, { price = '199.9' } = {}) {
  await user.type(await screen.findByLabelText('Título'), 'Teclado mecânico')
  await user.type(screen.getByLabelText('Descrição'), 'Teclado mecânico com switches azuis.')
  await user.selectOptions(screen.getByLabelText('Categoria'), 'laptops')
  await user.type(screen.getByLabelText('Preço (USD)'), price)
  await user.type(screen.getByLabelText('Estoque'), '10')
}

describe('criar produto', () => {
  it('cria o produto com imagem e volta para a lista com o aviso', async () => {
    // Sem atrasar o upload, ele termina antes de conseguirmos observar o
    // estado intermediário — e o teste viraria uma corrida instável.
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, async () => {
        await delay(100)
        return HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc123.png',
          location: UPLOADED_URL,
        })
      }),
    )
    const created = captureWrites('post', '/products/add')

    const { user } = renderApp('/products/new', { as: 'admin' })
    await fillValidProduct(user)
    await user.upload(imageInput(), makeFile('foto.png', 'image/png', 1000))

    // A prévia é LOCAL (blob:), sem esperar a rede: o serviço de upload responde
    // com Cross-Origin-Resource-Policy: same-origin, que bloquearia a URL remota.
    expect(await screen.findByRole('presentation')).toHaveAttribute(
      'src',
      expect.stringMatching(/^blob:/),
    )

    // Enquanto a imagem sobe, salvar criaria o produto sem a thumbnail.
    const submit = screen.getByRole('button', { name: 'Criar produto' })
    await waitFor(() => expect(submit).toBeDisabled())
    expect(screen.getByText(/aguarde o envio da imagem/i)).toBeInTheDocument()

    expect(await screen.findByText(/imagem enviada com sucesso/i)).toBeInTheDocument()
    await user.click(submit)

    // A API simula a escrita — o aviso diz isso em vez de prometer o item na lista.
    expect(await screen.findByText(/produto enviado com sucesso \(id 195\)/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument()

    // Números chegam como números (`valueAsNumber`), e a imagem como a URL
    // pública devolvida pelo upload.
    expect(created).toEqual([
      expect.objectContaining({
        title: 'Teclado mecânico',
        category: 'laptops',
        price: 199.9,
        stock: 10,
        thumbnail: UPLOADED_URL,
      }),
    ])
  })

  it('não envia nada à API enquanto houver campo inválido', async () => {
    const created = captureWrites('post', '/products/add')
    const { user } = renderApp('/products/new', { as: 'admin' })

    await user.click(await screen.findByRole('button', { name: 'Criar produto' }))

    expect(await screen.findByText(/título precisa ter ao menos 3 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/descrição precisa ter ao menos 10 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText('Selecione uma categoria')).toBeInTheDocument()
    // Campo numérico vazio vira NaN: sem mensagem própria, o usuário veria
    // "expected number, received nan".
    expect(screen.getByText('Informe um preço válido')).toBeInTheDocument()

    // aria-invalid + aria-describedby: o leitor de tela anuncia "inválido" E o motivo.
    const title = screen.getByLabelText('Título')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription(/título precisa ter ao menos 3 caracteres/i)

    // Corrigido o resto, a regra de negócio do preço ainda barra o envio.
    await fillValidProduct(user, { price: '-5' })
    await user.click(screen.getByRole('button', { name: 'Criar produto' }))

    expect(await screen.findByText('O preço precisa ser maior que zero')).toBeInTheDocument()
    expect(created).toEqual([])
  })

  it('mostra o erro da API sem apagar o que o usuário digitou', async () => {
    server.use(
      http.post(`${API_BASE}/products/add`, () =>
        HttpResponse.json({ message: 'Erro interno' }, { status: 500 }),
      ),
    )
    const { user } = renderApp('/products/new', { as: 'admin' })

    await fillValidProduct(user)
    await user.click(screen.getByRole('button', { name: 'Criar produto' }))

    // Perder o preenchimento por causa de uma falha de rede é das piores
    // experiências possíveis.
    expect(await screen.findByRole('alert')).toHaveTextContent(/api está indisponível/i)
    expect(screen.getByLabelText('Título')).toHaveValue('Teclado mecânico')
    expect(screen.getByRole('heading', { name: 'Novo produto' })).toBeInTheDocument()
  })

  it.each([
    { file: makeFile('grande.png', 'image/png', 3 * 1024 * 1024), message: /no máximo 2 MB/i },
    { file: makeFile('documento.pdf', 'application/pdf', 500), message: /PNG, JPG ou WebP/i },
  ])('recusa $file.name sem chamar a rede', async ({ file, message }) => {
    let uploads = 0
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () => {
        uploads += 1
        return HttpResponse.json({})
      }),
    )

    /**
     * `applyAccept: false`: por padrão o userEvent imita o seletor do sistema e
     * DESCARTA arquivos fora do `accept` — o PDF nem chegaria ao nosso código.
     * E desligar é o cenário realista: `accept` é só uma DICA; arrastar e
     * soltar aceita qualquer coisa, e é esse caminho que a validação cobre.
     */
    const { user } = renderApp('/products/new', {
      as: 'admin',
      userOptions: { applyAccept: false },
    })
    await screen.findByRole('heading', { name: 'Novo produto' })

    await user.upload(imageInput(), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(imageInput()).toHaveAccessibleDescription(message)
    expect(uploads).toBe(0)
  })

  it('mostra erro quando o upload falha', async () => {
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    const { user } = renderApp('/products/new', { as: 'admin' })
    await screen.findByRole('heading', { name: 'Novo produto' })

    await user.upload(imageInput(), makeFile('foto.png', 'image/png', 1000))

    expect(await screen.findByRole('alert')).toHaveTextContent(/api está indisponível/i)
    expect(screen.queryByText(/imagem enviada com sucesso/i)).not.toBeInTheDocument()
  })

  it('remove a imagem e libera a prévia da memória', async () => {
    const { user } = renderApp('/products/new', { as: 'admin' })
    await screen.findByRole('heading', { name: 'Novo produto' })

    await user.upload(imageInput(), makeFile('foto.png', 'image/png', 1000))
    await screen.findByText(/imagem enviada com sucesso/i)

    await user.click(screen.getByRole('button', { name: /remover imagem/i }))

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
    // Sem o revoke, cada troca de imagem deixaria o arquivo anterior preso na
    // memória do navegador até a aba fechar.
    expect(objectUrlTracker.created).toHaveLength(1)
    expect(objectUrlTracker.revoked).toEqual(objectUrlTracker.created)
  })
})

describe('editar produto', () => {
  it('parte dos dados atuais, envia a alteração e volta ao detalhe', async () => {
    const updated = captureWrites('put', '/products/:id')
    const { user } = renderApp('/products/1/edit', { as: 'admin' })

    const title = await screen.findByLabelText('Título')
    expect(title).toHaveValue('Notebook Pro 14')
    expect(screen.getByLabelText('Preço (USD)')).toHaveValue(1299.99)

    await user.clear(title)
    await user.type(title, 'Notebook Pro 16')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // A API não persiste: o detalhe volta com o título original — e o aviso
    // deixado pela tela de edição explica por quê.
    expect(await screen.findByRole('heading', { name: 'Notebook Pro 14' })).toBeInTheDocument()
    expect(screen.getByText(/alterações enviadas/i)).toBeInTheDocument()

    // Editar o título não exige reenviar a foto: a imagem atual segue valendo.
    expect(updated).toEqual([
      expect.objectContaining({
        title: 'Notebook Pro 16',
        price: 1299.99,
        thumbnail: 'https://cdn.test/notebook.png',
      }),
    ])
  })

  it('"Desfazer alterações" devolve os campos e a imagem ao estado inicial', async () => {
    const { user } = renderApp('/products/1/edit', { as: 'admin' })

    const title = await screen.findByLabelText('Título')
    await user.type(title, ' (editado)')
    await user.upload(imageInput(), makeFile('nova.png', 'image/png', 1000))
    await screen.findByText(/imagem enviada com sucesso/i)

    await user.click(screen.getByRole('button', { name: /desfazer alterações/i }))

    expect(title).toHaveValue('Notebook Pro 14')
    // A imagem volta a ser a do produto, e a prévia da que foi descartada é
    // liberada da memória.
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'https://cdn.test/notebook.png')
    expect(objectUrlTracker.revoked).toEqual(objectUrlTracker.created)
  })
})
