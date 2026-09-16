import { Button } from '@/components/ui/Button'
import { getErrorMessage, isRetryable } from '@/lib/http/errors'

/**
 * Tela de erro para dados que não carregaram.
 *
 * Duas decisões que importam para a UX:
 *   1. A mensagem vem de `getErrorMessage`, então o texto é consistente em todo
 *      o app e nunca vaza um stack trace para o usuário.
 *   2. "Tentar novamente" só aparece quando repetir pode funcionar. Oferecer
 *      retry num 404 é enganar o usuário: o resultado será o mesmo.
 */

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorState({
  error,
  onRetry,
  title = 'Não foi possível carregar',
}: ErrorStateProps) {
  const canRetry = onRetry !== undefined && isRetryable(error)

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12 text-center"
    >
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="max-w-md text-sm text-red-800">{getErrorMessage(error)}</p>
      {canRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
