import { LoadingState } from './LoadingState'

/**
 * Carregamento que ocupa a tela inteira.
 *
 * Usado pelo AuthGate enquanto a sessão é verificada e pelo router enquanto o
 * primeiro chunk carrega — extraído para não duplicar esse markup nos dois
 * lugares.
 */
export function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState label={label} />
    </div>
  )
}
