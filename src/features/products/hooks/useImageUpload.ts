import { useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '@/lib/http/errors'
import { uploadFile } from '@/lib/http/upload'
import { logger } from '@/lib/logger'

import { imageFileSchema } from '../schemas/product.schema'

/**
 * Estado do envio de UMA imagem: validar → pré-visualizar → enviar.
 *
 * Mora na feature (e não em `src/hooks`) porque as regras que ele aplica são as
 * do produto (formatos e tamanho aceitos). Vira código compartilhado se outra
 * feature precisar do mesmo fluxo.
 *
 * O hook cuida de três coisas que é fácil esquecer:
 *   1. validar ANTES de gastar rede com um arquivo que será recusado;
 *   2. criar e DESTRUIR o object URL da prévia (senão vaza memória);
 *   3. cancelar o upload em andamento se o componente desmontar.
 */

/**
 * `status` é uma MÁQUINA DE ESTADOS, e não um punhado de booleanos soltos.
 * Com `isUploading` + `isSuccess` + `hasError` separados existiriam oito
 * combinações, e a maioria não faz sentido ("enviando" e "com erro" ao mesmo
 * tempo?). Um union de quatro valores torna os estados inválidos impossíveis
 * de representar.
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface ImageUploadState {
  status: UploadStatus
  /** URL local (blob:) para exibir a prévia. Nunca é enviada à API. */
  previewUrl: string | null
  fileName: string | null
  percent: number
  error: string | null
}

const IDLE: ImageUploadState = {
  status: 'idle',
  previewUrl: null,
  fileName: null,
  percent: 0,
  error: null,
}

/** O que precisa ser desfeito quando a imagem atual sai de cena. */
interface ActiveUpload {
  controller: AbortController
  previewUrl: string
}

function discard(upload: ActiveUpload | null): void {
  if (upload === null) return

  // Abortar um envio que já terminou não faz nada — não precisamos checar.
  upload.controller.abort()

  /**
   * `URL.createObjectURL` registra o arquivo na memória do navegador e ele SÓ
   * é liberado quando revogamos ou a aba fecha. Sem este revoke, trocar de
   * imagem dez vezes mantém as dez na memória — um vazamento silencioso, que
   * dói de verdade com arquivos grandes.
   */
  URL.revokeObjectURL(upload.previewUrl)
}

/**
 * @param onChange Recebe a URL pública quando o upload termina, e `undefined`
 *   quando deixa de haver imagem (remoção, troca, arquivo recusado ou falha).
 *   É o mesmo formato do `onChange` de um campo do React Hook Form.
 */
export function useImageUpload(onChange: (url: string | undefined) => void) {
  const [state, setState] = useState(IDLE)

  /**
   * Um `ref`, e não state: este valor não aparece na tela, só serve para a
   * limpeza. E a limpeza do desmonte precisa enxergar o valor MAIS RECENTE, o
   * que um efeito com `[]` não conseguiria lendo o state.
   */
  const active = useRef<ActiveUpload | null>(null)

  useEffect(() => {
    return () => discard(active.current)
  }, [])

  function clear() {
    discard(active.current)
    active.current = null
    setState(IDLE)
    onChange(undefined)
  }

  async function selectFile(file: File) {
    // Uma escolha nova SUBSTITUI a imagem anterior, esteja ela enviada ou subindo.
    discard(active.current)
    active.current = null
    onChange(undefined)

    // 1. VALIDAR primeiro — não gasta rede com arquivo que será recusado.
    const validation = imageFileSchema.safeParse(file)

    if (!validation.success) {
      setState({
        ...IDLE,
        status: 'error',
        fileName: file.name,
        error: validation.error.issues[0]?.message ?? 'Arquivo inválido',
      })
      return
    }

    // 2. PRÉVIA IMEDIATA, antes do upload terminar.
    // Usamos o arquivo local em vez da URL devolvida pela API por dois motivos:
    // aparece na hora (sem esperar a rede) e não depende de o servidor permitir
    // a exibição em outra origem — o serviço de upload deste projeto responde
    // com `Cross-Origin-Resource-Policy: same-origin`, que faria o navegador
    // bloquear a imagem remota. Ver docs.md > Upload de arquivos.
    const upload: ActiveUpload = {
      controller: new AbortController(),
      previewUrl: URL.createObjectURL(file),
    }
    active.current = upload

    setState({
      status: 'uploading',
      previewUrl: upload.previewUrl,
      fileName: file.name,
      percent: 0,
      error: null,
    })

    // 3. ENVIAR.
    try {
      const uploaded = await uploadFile(file, {
        signal: upload.controller.signal,
        onProgress: ({ percent }) => setState((previous) => ({ ...previous, percent })),
      })

      setState((previous) => ({ ...previous, status: 'success', percent: 100 }))
      onChange(uploaded.location)
    } catch (error) {
      // Cancelamento (troca, remoção ou desmonte) é uma escolha do usuário, não
      // uma falha a exibir — e a tela já mostra outra coisa.
      if (upload.controller.signal.aborted) return

      logger.error('Falha ao enviar a imagem', error)
      setState((previous) => ({ ...previous, status: 'error', error: getErrorMessage(error) }))
    }
  }

  return {
    ...state,
    // Estado DERIVADO: sai de `status`, não é guardado à parte.
    isUploading: state.status === 'uploading',
    selectFile,
    clear,
  }
}

export type ImageUpload = ReturnType<typeof useImageUpload>
