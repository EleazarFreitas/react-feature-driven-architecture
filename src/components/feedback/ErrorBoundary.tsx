import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

/**
 * Rede de segurança para erros de RENDERIZAÇÃO.
 *
 * Sem um Error Boundary, uma exceção durante o render desmonta a árvore inteira
 * e o usuário fica com uma página totalmente branca — o pior resultado possível.
 *
 * O que ele NÃO captura (confusão clássica, por isso está escrito aqui):
 *   - erros dentro de event handlers (onClick);
 *   - erros em código assíncrono (promises, setTimeout).
 * É por isso que a camada HTTP tem o próprio tratamento de erros: são caminhos
 * diferentes. Este boundary cobre só o "o componente explodiu ao renderizar".
 *
 * Precisa ser class component: ainda não existe equivalente em hooks.
 */

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Ponto natural para enviar ao serviço de observabilidade (ver lib/logger).
    logger.error('Erro não tratado na renderização', error, {
      componentStack: info.componentStack,
    })
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Algo deu errado</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ocorreu um erro inesperado nesta página. Tente recarregar.
          </p>
          {/*
            Recarregar a página inteira é deliberado: depois de um erro de render
            o estado em memória pode estar inconsistente, e um reload garante um
            ponto de partida limpo.
          */}
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
