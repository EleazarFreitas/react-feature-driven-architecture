import { Button } from '@/components/ui/Button'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { ProgressBar } from '@/components/ui/ProgressBar'

import type { ImageUpload } from '../hooks/useImageUpload'
import { ACCEPTED_IMAGE_TYPES } from '../schemas/product.schema'

/**
 * Campo de imagem do produto — só a APRESENTAÇÃO.
 *
 * Divisão de papéis:
 *   - <FileDropzone>   UI genérica de escolher arquivo (não sabe o que é produto)
 *   - useImageUpload   validação, prévia, envio e limpeza de memória
 *   - ESTE componente  desenha o estado que o hook expõe
 *
 * O hook é chamado no <ProductForm>, e não aqui, porque DOIS lugares dependem
 * do estado do upload: este campo (prévia, progresso) e o botão "Salvar" (que
 * trava enquanto a imagem sobe). Estado usado por dois componentes mora no
 * ancestral comum e desce por props — a alternativa seria este componente
 * "avisar" o pai com um efeito, que é exatamente o tipo de sincronização que
 * gera bugs.
 */

interface ProductImageFieldProps {
  upload: ImageUpload
  /** URL guardada no formulário (no modo edição, a imagem atual do produto). */
  currentUrl: string | undefined
  disabled?: boolean
}

export function ProductImageField({
  upload,
  currentUrl,
  disabled = false,
}: ProductImageFieldProps) {
  // No modo edição já existe uma imagem salva, mas nenhuma prévia local —
  // então caímos na URL do produto, que vem do CDN da API de produtos e
  // carrega normalmente.
  const imageToShow = upload.previewUrl ?? currentUrl

  return (
    <div className="flex flex-col gap-3">
      <FileDropzone
        label="Imagem do produto"
        hint="PNG, JPG ou WebP · até 2 MB"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        // `void`: selectFile é assíncrona e trata os próprios erros; o handler
        // de evento não tem o que fazer com a promise.
        onFileSelected={(file) => void upload.selectFile(file)}
        disabled={disabled || upload.isUploading}
        error={upload.error ?? undefined}
      />

      {imageToShow !== undefined && (
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
                <p className="text-xs text-slate-500">Enviando... {upload.percent}%</p>
              </>
            )}

            {upload.status === 'success' && (
              // `role="status"` anuncia a conclusão sem roubar o foco.
              <p role="status" className="text-xs text-green-700">
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
