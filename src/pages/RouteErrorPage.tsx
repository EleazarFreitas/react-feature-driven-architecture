import { useEffect } from 'react'
import { useRouteError } from 'react-router'

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
 *   - RouteErrorPage  → falhas ao carregar ou renderizar uma rota (inclusive
 *                        falha ao baixar um chunk lazy, comum após um deploy);
 *   - ErrorBoundary   → falhas fora do router (um provider, por exemplo).
 */
export function RouteErrorPage() {
  const error = useRouteError()

  // Logar é um efeito colateral: dentro de um efeito ele roda uma vez por erro,
  // e não a cada re-render do componente.
  useEffect(() => {
    logger.error('Erro na rota', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Algo deu errado</h1>
      <p className="max-w-md text-sm text-slate-500">{getErrorMessage(error)}</p>
      <Button onClick={() => window.location.reload()}>Recarregar página</Button>
    </main>
  )
}
