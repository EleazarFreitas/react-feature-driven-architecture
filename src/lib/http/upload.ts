import { z } from 'zod'

import { env } from '@/config/env'
import { logger } from '@/lib/logger'

import { HttpError, NetworkError } from './errors'

/**
 * Upload de arquivo com barra de progresso.
 *
 * POR QUE ESTE MÓDULO NÃO USA `fetch` (e o resto do projeto usa)?
 * Porque o `fetch` NÃO consegue reportar progresso de ENVIO. Ele expõe o corpo
 * da resposta como stream (progresso de download), mas o corpo da requisição
 * sobe sem nenhum evento. Não é limitação da nossa implementação: é da API.
 *
 * O `XMLHttpRequest` — mais antigo, e ainda a única opção para isto — expõe
 * `xhr.upload.onprogress`. É exatamente o caso citado em docs.md como motivo
 * legítimo para considerar o Axios: ele usa XHR por baixo justamente por causa
 * disso. Aqui resolvemos com ~40 linhas e sem dependência nova.
 *
 * POR QUE UM MÓDULO SEPARADO DE `client.ts`:
 * a mecânica é diferente em três pontos (corpo multipart, progresso, outra base
 * URL). Enfiar tudo no cliente principal o deixaria cheio de ramificações que
 * 95% das requisições nunca usam.
 *
 * O que MANTEMOS igual ao cliente principal: os tipos de erro. Quem chama trata
 * uma falha de upload com o mesmo `getErrorMessage` de qualquer outra falha.
 */

/** Resposta de POST /files/upload (verificada contra a API real). */
const uploadResponseSchema = z.object({
  /** Nome que o arquivo tinha no computador do usuário. */
  originalname: z.string(),
  /** Nome gerado pelo servidor (ex.: "8c89.png"). */
  filename: z.string(),
  /** URL pública do arquivo — é o que guardamos no produto. */
  location: z.url(),
})

export type UploadedFile = z.infer<typeof uploadResponseSchema>

export interface UploadProgress {
  /** Bytes já enviados. */
  loaded: number
  /** Tamanho total, em bytes. */
  total: number
  /** 0 a 100, já arredondado — é o que a barra de progresso consome. */
  percent: number
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  /** Permite cancelar (usuário removeu o arquivo ou saiu da tela). */
  signal?: AbortSignal
}

export function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadedFile> {
  const { onProgress, signal } = options

  return new Promise<UploadedFile>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelado', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${env.VITE_UPLOAD_API_BASE_URL}/files/upload`)

    /**
     * ⚠️ A ARMADILHA Nº 1 DO UPLOAD — não defina o Content-Type aqui.
     *
     * É tentador escrever:
     *     xhr.setRequestHeader('Content-Type', 'multipart/form-data')   // ERRADO
     *
     * O corpo multipart separa os campos por um `boundary`, uma string aleatória
     * que precisa aparecer TANTO no cabeçalho quanto no corpo. Só o navegador
     * conhece o boundary que ele gerou. Definindo o header à mão, o boundary
     * some do cabeçalho e o servidor não consegue separar os campos — daí o
     * clássico "upload que responde 400 sem explicação".
     *
     * Passando um FormData e não tocando no header, o navegador monta
     * `multipart/form-data; boundary=----WebKitFormBoundary...` sozinho.
     */
    const body = new FormData()
    // O nome do campo ("file") é definido pela API, não por nós.
    body.append('file', file)

    // `xhr.upload` é o que mede o ENVIO. `xhr.onprogress` (sem `.upload`)
    // mediria o download da resposta — que aqui é um JSON minúsculo.
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        // `lengthComputable` é false quando o tamanho total é desconhecido
        // (corpo em streaming). Aí não há porcentagem a exibir.
        if (!event.lengthComputable) return

        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        logger.debug('Upload recebeu status de erro', { status: xhr.status })
        reject(new HttpError(xhr.status, `Falha ao enviar o arquivo (erro ${xhr.status})`, null))
        return
      }

      try {
        // Validamos a resposta como em qualquer outro service: o formato vem da
        // rede e nenhum tipo estático garante o que chegou.
        resolve(uploadResponseSchema.parse(JSON.parse(xhr.responseText)))
      } catch (error) {
        logger.error('Resposta de upload em formato inesperado', error)
        reject(new HttpError(xhr.status, 'A resposta do serviço de upload é inválida.', null))
      }
    }

    // Falha de rede: o XHR não informa o motivo (por segurança), então só
    // sabemos que não chegou lá.
    xhr.onerror = () => reject(new NetworkError())

    xhr.ontimeout = () => reject(new NetworkError())

    xhr.onabort = () => reject(new DOMException('Upload cancelado', 'AbortError'))

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    xhr.send(body)
  })
}
