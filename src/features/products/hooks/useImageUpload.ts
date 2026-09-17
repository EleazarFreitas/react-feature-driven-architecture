import { useCallback, useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '@/lib/http/errors'
import { uploadFile, type UploadProgress } from '@/lib/http/upload'
import { logger } from '@/lib/logger'

import { imageFileSchema } from '../schemas/product.schema'

/**
 * Estado do envio de UMA imagem: validar → pré-visualizar → enviar.
 *
 * Mora na feature (e não em `src/hooks`) porque hoje só a feature de produtos
 * usa, e as regras que ele aplica são as do produto. Vira código compartilhado
 * quando aparecer o segundo consumidor — o critério documentado no projeto.
 *
 * O hook cuida de três coisas que é fácil esquecer:
 *   1. validar ANTES de gastar rede com um arquivo que será recusado;
 *   2. criar e DESTRUIR o object URL do preview (senão vaza memória);
 *   3. cancelar o upload em andamento se o componente desmontar.
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

const INITIAL_STATE: ImageUploadState = {
  status: 'idle',
  previewUrl: null,
  fileName: null,
  percent: 0,
  error: null,
}

interface UseImageUploadOptions {
  /** Chamado quando o upload termina; recebe a URL pública do arquivo. */
  onUploaded: (url: string) => void
  /**
   * Chamado quando o valor deve ser zerado: remoção manual (`clear()`),
   * arquivo reprovado na validação ou falha no upload.
   */
  onCleared: () => void
}

export function useImageUpload({ onUploaded, onCleared }: UseImageUploadOptions) {
  const [state, setState] = useState<ImageUploadState>(INITIAL_STATE)

  const abortRef = useRef<AbortController | null>(null)

  /**
   * Guardamos o object URL num ref além do state porque a limpeza precisa
   * acontecer no desmonte, e o closure do `useEffect` de desmonte não enxerga
   * o valor mais recente do state.
   */
  const previewUrlRef = useRef<string | null>(null)

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current === null) return

    /**
     * `URL.createObjectURL` registra o arquivo na memória do navegador e ele
     * SÓ é liberado quando revogamos ou a aba fecha. Sem este revoke, trocar de
     * imagem dez vezes mantém as dez na memória — um vazamento silencioso, que
     * dói de verdade com arquivos grandes.
     */
    URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
  }, [])

  // Limpeza no desmonte: cancela o upload em andamento e libera a prévia.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      releasePreview()
    }
  }, [releasePreview])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    releasePreview()
    setState(INITIAL_STATE)
    onCleared()
  }, [releasePreview, onCleared])

  const selectFile = useCallback(
    async (file: File) => {
      // Um upload novo cancela o anterior: o usuário mudou de ideia.
      abortRef.current?.abort()
      releasePreview()

      // 1. VALIDAR primeiro — não gasta rede com arquivo que será recusado.
      const validation = imageFileSchema.safeParse(file)

      if (!validation.success) {
        setState({
          ...INITIAL_STATE,
          status: 'error',
          fileName: file.name,
          error: validation.error.issues[0]?.message ?? 'Arquivo inválido',
        })
        onCleared()
        return
      }

      // 2. PRÉVIA IMEDIATA, antes do upload terminar.
      // Usamos o arquivo local em vez da URL devolvida pela API por dois
      // motivos: aparece na hora (sem esperar a rede) e não depende de o
      // servidor permitir a exibição em outra origem — o serviço de upload
      // deste projeto responde com `Cross-Origin-Resource-Policy: same-origin`,
      // que faria o navegador bloquear a imagem remota. Ver docs.md > Upload.
      const previewUrl = URL.createObjectURL(file)
      previewUrlRef.current = previewUrl

      setState({
        status: 'uploading',
        previewUrl,
        fileName: file.name,
        percent: 0,
        error: null,
      })

      // 3. ENVIAR.
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const uploaded = await uploadFile(file, {
          signal: controller.signal,
          onProgress: (progress: UploadProgress) => {
            setState((previous) => ({ ...previous, percent: progress.percent }))
          },
        })

        setState((previous) => ({ ...previous, status: 'success', percent: 100 }))
        onUploaded(uploaded.location)
      } catch (error) {
        // Cancelamento é uma escolha do usuário, não uma falha a exibir.
        if (error instanceof DOMException && error.name === 'AbortError') return

        logger.error('Falha ao enviar a imagem', error)

        setState((previous) => ({
          ...previous,
          status: 'error',
          error: getErrorMessage(error),
        }))
        onCleared()
      }
    },
    [releasePreview, onUploaded, onCleared],
  )

  return {
    ...state,
    isUploading: state.status === 'uploading',
    selectFile,
    clear,
  }
}
