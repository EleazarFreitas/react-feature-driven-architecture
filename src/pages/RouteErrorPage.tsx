import { useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { getErrorMessage } from '@/lib/http/errors'
import { logger } from '@/lib/logger'

/**
 * Erro não tratado DENTRO de uma rota.
 *
 * Por que existe, se já temos um <ErrorBoundary>: o React Router intercepta os
 * erros das rotas antes que eles cheguem a um Error Boundary externo, e sem um
 * `errorElement` ele mostra a própria tela de erro técnica (com stack trace).
 * Os dois se complementam:
 *
 *   - RouteErrorPage  → falhas ao renderizar uma rota (inclusive falha ao
 *                        carregar um chunk lazy, comum após um deploy novo);
 *   - ErrorBoundary   → falhas fora do router (o AuthGate, por exemplo).
 */
export function RouteErrorPage() {
  const error: unknown = useRouteError()

  logger.error('Erro na rota', error)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Algo deu errado</h1>
      <p className="max-w-md text-sm text-slate-500">{getErrorMessage(error)}</p>
      <Button onClick={() => window.location.reload()}>Recarregar página</Button>
    </main>
  )
}
