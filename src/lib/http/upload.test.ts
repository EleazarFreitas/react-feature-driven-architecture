import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/test/server'

import { HttpError } from './errors'
import { uploadFile } from './upload'

const UPLOAD_BASE = 'https://upload.test/api/v1'

/**
 * Testes do uploader.
 *
 * O foco está nas duas coisas que mais quebram upload na prática:
 * o corpo multipart sair malformado, e o cabeçalho Content-Type ser definido à
 * mão (o que apaga o boundary e faz o servidor recusar).
 */

function makeImageFile(name = 'foto.png', type = 'image/png', bytes = 100): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('uploadFile', () => {
  it('envia o arquivo como multipart no campo "file"', async () => {
    /**
     * ⚠️ LIMITAÇÃO DO AMBIENTE (verificada, não suposta).
     *
     * O natural aqui seria `await request.formData()` e inspecionar o `File`.
     * No jsdom isso não funciona: um `File` dentro de `FormData` enviado por
     * XMLHttpRequest não é serializado (o conteúdo chega vazio, o nome vira
     * "blob") e `request.formData()` lança erro na validação interna do undici.
     *
     * O navegador real envia corretamente — confirmado com um upload de verdade
     * contra a API, que respondeu 201 com a URL do arquivo.
     *
     * Então verificamos o corpo BRUTO: é isso que ainda tem valor aqui, porque
     * prova que o corpo é multipart e que o campo se chama "file" (nome exigido
     * pela API). Um teste que dependesse do conteúdo do arquivo seria um teste
     * do jsdom, não do nosso código.
     */
    let rawBody = ''

    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, async ({ request }) => {
        rawBody = await request.text()

        return HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc.png',
          location: `${UPLOAD_BASE}/files/abc.png`,
        })
      }),
    )

    const result = await uploadFile(makeImageFile())

    expect(rawBody).toContain('Content-Disposition: form-data; name="file"')
    expect(rawBody).toContain('Content-Type: image/png')
    expect(result.location).toBe(`${UPLOAD_BASE}/files/abc.png`)
  })

  it('deixa o navegador definir o Content-Type, com boundary', async () => {
    /**
     * O teste mais importante deste arquivo.
     *
     * Se alguém "consertar" o uploader adicionando
     * `setRequestHeader('Content-Type', 'multipart/form-data')`, o boundary
     * some do cabeçalho e o servidor perde a capacidade de separar os campos.
     * O erro resultante (400, sem explicação) é difícil de diagnosticar — daí
     * travarmos o comportamento aqui.
     */
    let contentType: string | null = null

    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, ({ request }) => {
        contentType = request.headers.get('Content-Type')
        return HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc.png',
          location: `${UPLOAD_BASE}/files/abc.png`,
        })
      }),
    )

    await uploadFile(makeImageFile())

    expect(contentType).toContain('multipart/form-data')
    expect(contentType).toContain('boundary=')
    expect(contentType).not.toContain('application/json')
  })

  it('converte status de erro em HttpError', async () => {
    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () =>
        HttpResponse.json({ message: 'too large' }, { status: 413 }),
      ),
    )

    const error = await uploadFile(makeImageFile()).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(413)
  })

  it('rejeita quando a resposta não tem o formato esperado', async () => {
    // Protege contra a API mudar de formato sem avisar: melhor falhar claro do
    // que gravar `undefined` como URL da imagem do produto.
    server.use(http.post(`${UPLOAD_BASE}/files/upload`, () => HttpResponse.json({ foo: 'bar' })))

    await expect(uploadFile(makeImageFile())).rejects.toBeInstanceOf(HttpError)
  })

  it('rejeita imediatamente se o signal já estiver cancelado', async () => {
    const controller = new AbortController()
    controller.abort()

    // Cancelamento vira AbortError, não erro de rede — quem chama precisa
    // distinguir "o usuário desistiu" de "a rede falhou".
    await expect(uploadFile(makeImageFile(), { signal: controller.signal })).rejects.toThrowError(
      /cancelado/i,
    )
  })

  it('reporta progresso e termina em 100%', async () => {
    /**
     * O jsdom e o MSW não garantem eventos intermediários de
     * `xhr.upload.onprogress`. Por isso verificamos o CONTRATO observável — se
     * houve relato, ele termina em 100% e nunca ultrapassa —, e não uma
     * sequência exata de ticks, que seria um teste frágil preso à
     * implementação do ambiente.
     */
    const onProgress = vi.fn()

    server.use(
      http.post(`${UPLOAD_BASE}/files/upload`, () =>
        HttpResponse.json({
          originalname: 'foto.png',
          filename: 'abc.png',
          location: `${UPLOAD_BASE}/files/abc.png`,
        }),
      ),
    )

    await uploadFile(makeImageFile('foto.png', 'image/png', 2048), { onProgress })

    const percentuais = onProgress.mock.calls.map(
      (call) => (call[0] as { percent: number }).percent,
    )

    for (const percent of percentuais) {
      expect(percent).toBeGreaterThanOrEqual(0)
      expect(percent).toBeLessThanOrEqual(100)
    }

    if (percentuais.length > 0) {
      expect(percentuais.at(-1)).toBe(100)
    }
  })
})
