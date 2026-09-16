import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/test/server'
import { objectUrlTracker } from '@/test/setup'

import { ProductImageField } from './ProductImageField'

const UPLOAD_BASE = 'https://upload.test/api/v1'

/**
 * Testes do campo de imagem.
 *
 * Exercitam o caminho que o usuário percorre: escolher um arquivo, ver a
 * prévia, ver o resultado do envio, remover. A validação é testada pelo que ela
 * PRODUZ na tela, não chamando o esquema Zod diretamente.
 */

function makeFile(name: string, type: string, sizeInBytes: number): File {
  return new File([new Uint8Array(sizeInBytes)], name, { type })
}

/** Espelha o uso real: o valor do campo é controlado por quem o usa. */
function Harness({ onUploadingChange = vi.fn() }: { onUploadingChange?: (b: boolean) => void }) {
  const [value, setValue] = useState<string | undefined>(undefined)

  return (
    <>
      <ProductImageField value={value} onChange={setValue} onUploadingChange={onUploadingChange} />
      {/* Expõe o valor do formulário para o teste conseguir afirmar sobre ele. */}
      <output data-testid="valor">{value ?? 'vazio'}</output>
    </>
  )
}

function getFileInput(): HTMLInputElement {
  return screen.getByLabelText(/imagem do produto/i)
}

describe('ProductImageField', () => {
  it('envia a imagem escolhida e entrega a URL ao formulário', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('foto.png', 'image/png', 1000))

    await waitFor(() => {
      expect(screen.getByTestId('valor')).toHaveTextContent(`${UPLOAD_BASE}/files/abc123.png`)
    })

    expect(await screen.findByText(/imagem enviada com sucesso/i)).toBeInTheDocument()
  })

  it('mostra a prévia local logo após escolher, sem esperar a rede', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('foto.png', 'image/png', 1000))

    // A prévia usa um object URL local (blob:) — e não a URL remota — porque o
    // serviço de upload responde com Cross-Origin-Resource-Policy: same-origin,
    // que faria o navegador bloquear a imagem. Ver docs.md > Upload.
    const img = await screen.findByRole('presentation')
    expect(img.getAttribute('src')).toMatch(/^blob:/)
  })

  it('recusa arquivo acima de 2 MB sem chamar a rede', async () => {
    let chamou = false
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () => {
        chamou = true
        return HttpResponse.json({})
      }),
    )

    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('grande.png', 'image/png', 3 * 1024 * 1024))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no máximo 2 MB/i)
    // Validar antes de enviar economiza rede e dá resposta instantânea.
    expect(chamou).toBe(false)
    expect(screen.getByTestId('valor')).toHaveTextContent('vazio')
  })

  it('recusa formato não aceito', async () => {
    /**
     * `applyAccept: false` no setup é essencial aqui, e ensina algo real.
     *
     * Por padrão o userEvent imita o seletor do sistema e DESCARTA arquivos que
     * não casam com o atributo `accept`. Sem desligar isso, o arquivo nem
     * chegaria ao nosso código e o teste passaria sem exercitar a validação.
     *
     * E desligar é o cenário realista: `accept` é apenas uma DICA de interface.
     * O usuário pode escolher "todos os arquivos" no seletor do sistema ou
     * arrastar e soltar qualquer coisa — que é exatamente o caminho que a
     * validação existe para cobrir.
     */
    const user = userEvent.setup({ applyAccept: false })
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('documento.pdf', 'application/pdf', 500))

    expect(await screen.findByRole('alert')).toHaveTextContent(/PNG, JPG ou WebP/i)
  })

  it('liga a mensagem de erro ao campo para leitores de tela', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('documento.pdf', 'application/pdf', 500))
    await screen.findByRole('alert')

    const input = getFileInput()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/PNG, JPG ou WebP/i)
  })

  it('mostra erro quando o upload falha, mantendo o campo sem valor', async () => {
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )

    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('foto.png', 'image/png', 1000))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('valor')).toHaveTextContent('vazio')
  })

  it('remove a imagem e libera o object URL da memória', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(getFileInput(), makeFile('foto.png', 'image/png', 1000))
    await screen.findByText(/imagem enviada com sucesso/i)

    expect(objectUrlTracker.created.length).toBe(1)

    await user.click(screen.getByRole('button', { name: /remover imagem/i }))

    expect(screen.getByTestId('valor')).toHaveTextContent('vazio')
    // O revoke é o que evita vazamento de memória — sem ele, cada troca de
    // imagem deixaria o arquivo anterior preso na memória do navegador.
    expect(objectUrlTracker.revoked).toEqual(objectUrlTracker.created)
  })

  it('avisa o formulário enquanto o envio está em andamento', async () => {
    const onUploadingChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onUploadingChange={onUploadingChange} />)

    await user.upload(getFileInput(), makeFile('foto.png', 'image/png', 1000))
    await screen.findByText(/imagem enviada com sucesso/i)

    // É esse sinal que bloqueia o botão "Salvar" durante o envio.
    expect(onUploadingChange).toHaveBeenCalledWith(true)
    expect(onUploadingChange).toHaveBeenLastCalledWith(false)
  })
})
