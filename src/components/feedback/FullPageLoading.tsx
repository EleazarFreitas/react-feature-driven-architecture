import { LoadingState } from './LoadingState'

/**
 * Carregamento que ocupa a tela inteira.
 *
 * É o que o router mostra no boot, enquanto a sessão é resolvida e o chunk da
 * primeira rota é baixado (ver `hydrateFallbackElement` em app/router.tsx).
 */
export function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState label={label} />
    </div>
  )
}
