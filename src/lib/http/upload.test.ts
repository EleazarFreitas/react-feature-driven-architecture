import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { UPLOAD_BASE } from '@/test/handlers'
import { server } from '@/test/server'

import { HttpError } from './errors'
import { uploadFile } from './upload'

/**
 * Testes do uploader.
 *
 * O fluxo do usuário (prévia, bloqueio do "Salvar", erro na tela) é coberto
 * pelas páginas de produto. Aqui ficam as duas coisas que mais quebram upload
 * na prática e que a tela não enxerga: o corpo multipart sair malformado, e o
 * Content-Type ser definido à mão (o que apaga o boundary e faz o servidor
 * recusar sem explicação).
 */

function makeImageFile(): File {
  return new File([new Uint8Array(100)], 'foto.png', { type: 'image/png' })
}

describe('uploadFile', () => {
  it('envia multipart no campo "file", com o Content-Type gerado pelo navegador', async () => {
    /**
     * ⚠️ LIMITAÇÃO DO AMBIENTE (verificada, não suposta): no jsdom, um `File`
     * dentro de `FormData` enviado por XMLHttpRequest não é serializado (o
     * conteúdo chega vazio) e `request.formData()` lança erro no undici. O
     * navegador real envia corretamente. Por isso inspecionamos o corpo BRUTO:
     * ele ainda prova que é multipart e que o campo se chama "file".
     */
    let rawBody = ''
    let contentType: string | null = null

    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, async ({ request }) => {
        rawBody = await request.text()
        contentType = request.headers.get('Content-Type')
        return HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc.png',
          location: `${UPLOAD_BASE}/files/abc.png`,
        })
      }),
    )

    const result = await uploadFile(makeImageFile())

    expect(result.location).toBe(`${UPLOAD_BASE}/files/abc.png`)
    expect(rawBody).toContain('Content-Disposition: form-data; name="file"')
    expect(rawBody).toContain('Content-Type: image/png')

    // Se alguém "consertar" o uploader com
    // `setRequestHeader('Content-Type', 'multipart/form-data')`, o boundary some
    // e o servidor perde a capacidade de separar os campos.
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
  })

  it.each([
    { scenario: 'status de erro', response: () => HttpResponse.json({}, { status: 413 }) },
    // A API mudou de formato sem avisar: melhor falhar claro do que gravar
    // `undefined` como URL da imagem do produto.
    { scenario: 'resposta em formato inesperado', response: () => HttpResponse.json({ foo: 1 }) },
  ])('rejeita com HttpError em $scenario', async ({ response }) => {
    server.use(http.post(`${UPLOAD_BASE}/files/upload`, response))

    await expect(uploadFile(makeImageFile())).rejects.toBeInstanceOf(HttpError)
  })

  it('rejeita imediatamente se o signal já estiver cancelado', async () => {
    const controller = new AbortController()
    controller.abort()

    // Cancelamento não é erro de rede — quem chama precisa distinguir "o
    // usuário desistiu" de "a rede falhou".
    await expect(uploadFile(makeImageFile(), { signal: controller.signal })).rejects.toThrowError(
      /cancelado/i,
    )
  })
})
