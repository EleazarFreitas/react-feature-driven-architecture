import { useCallback, useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { ProgressBar } from '@/components/ui/ProgressBar'

import { useImageUpload } from '../hooks/useImageUpload'
import { ACCEPTED_IMAGE_TYPES } from '../schemas/product.schema'

/**
 * Campo de imagem do produto.
 *
 * Divisão de papéis, seguindo o que o resto do projeto faz:
 *   - <FileDropzone>      UI genérica de escolher arquivo (não sabe o que é produto)
 *   - useImageUpload      validação, prévia, envio e limpeza de memória
 *   - ESTE componente     junta os dois e entrega a URL final ao formulário
 *
 * Ele recebe `value`/`onChange` no formato que o React Hook Form espera, o que
 * o torna um campo controlado comum aos olhos do formulário.
 */

interface ProductImageFieldProps {
  /** URL já enviada (no modo edição, vem do produto). */
  value: string | undefined
  onChange: (url: string | undefined) => void
  /** Avisa o formulário para bloquear o submit durante o envio. */
  onUploadingChange: (isUploading: boolean) => void
  disabled?: boolean
}

export function ProductImageField({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: ProductImageFieldProps) {
  // `useCallback` aqui não é otimização: estas funções entram no array de
  // dependências do useImageUpload, e recriá-las a cada render faria os
  // `useCallback` internos dele mudarem de identidade sem necessidade.
  const handleUploaded = useCallback((url: string) => onChange(url), [onChange])
  const handleCleared = useCallback(() => onChange(undefined), [onChange])

  const upload = useImageUpload({ onUploaded: handleUploaded, onCleared: handleCleared })

  useEffect(() => {
    onUploadingChange(upload.isUploading)
  }, [upload.isUploading, onUploadingChange])

  // No modo edição já existe uma imagem salva, mas nenhuma prévia local —
  // então caímos na URL do produto, que vem do CDN da API de produtos e
  // carrega normalmente.
  const imageToShow = upload.previewUrl ?? value ?? null
  const hasImage = imageToShow !== null

  return (
    <div className="flex flex-col gap-3">
      <FileDropzone
        label="Imagem do produto"
        hint="PNG, JPG ou WebP · até 2 MB"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onFileSelected={(file) => void upload.selectFile(file)}
        disabled={disabled || upload.isUploading}
        error={upload.error ?? undefined}
      />

      {hasImage && (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
          <img
            src={imageToShow}
            // A prévia é decorativa: o nome do arquivo aparece como texto ao
            // lado, então repetir a informação no `alt` só geraria ruído para
            // quem usa leitor de tela. `alt=""` é a forma correta de dizer
            // "ignore esta imagem" — bem diferente de omitir o atributo.
            alt=""
            className="h-20 w-20 rounded border border-slate-200 object-contain"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-sm font-medium text-slate-800">
              {upload.fileName ?? 'Imagem atual'}
            </p>

            {upload.isUploading && (
              <>
                <ProgressBar percent={upload.percent} label="Enviando imagem" />
                {/* `aria-live` anuncia a conclusão sem roubar o foco. */}
                <p className="text-xs text-slate-500" aria-live="polite">
                  Enviando... {upload.percent}%
                </p>
              </>
            )}

            {upload.status === 'success' && (
              <p className="text-xs text-green-700" aria-live="polite">
                Imagem enviada com sucesso.
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={upload.clear}
            disabled={disabled}
            // Sem o nome do arquivo, um leitor de tela anunciaria só "Remover".
            aria-label={`Remover imagem ${upload.fileName ?? ''}`.trim()}
          >
            Remover
          </Button>
        </div>
      )}
    </div>
  )
}
