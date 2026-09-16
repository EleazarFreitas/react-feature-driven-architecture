/**
 * Logger mínimo e centralizado.
 *
 * Por que não usar `console.log` direto? Dois motivos práticos:
 *
 * 1. `console.log` espalhado pelo código vira ruído e acaba indo para produção.
 *    Aqui os logs de debug são desligados por configuração (VITE_ENABLE_DEBUG_LOGS).
 * 2. Ter UM ponto de saída é o que torna possível, depois, plugar um serviço de
 *    observabilidade (Sentry, Datadog...) sem caçar console.* em 50 arquivos.
 *    Veja o comentário em `logger.error`.
 *
 * Isto NÃO é uma biblioteca de logging. É uma indireção de 20 linhas que paga
 * seu custo justamente por ser pequena.
 */
import { env } from '@/config/env'

type LogContext = Record<string, unknown>

export const logger = {
  /** Ruído de desenvolvimento. Silencioso em produção. */
  debug(message: string, context?: LogContext): void {
    if (!env.VITE_ENABLE_DEBUG_LOGS) return
    // eslint-disable-next-line no-console -- único ponto do app que loga debug
    console.log(`[debug] ${message}`, context ?? '')
  },

  /** Algo inesperado, mas do qual a aplicação se recuperou. */
  warn(message: string, context?: LogContext): void {
    console.warn(`[warn] ${message}`, context ?? '')
  },

  /**
   * Algo quebrou. Em produção este é o lugar onde entraria o envio para um
   * serviço de observabilidade, por exemplo:
   *
   *   Sentry.captureException(error, { extra: context })
   *
   * Não adicionamos Sentry aqui porque exigiria uma conta/DSN e nada disso é
   * necessário para estudar o projeto. O ponto de extensão já está pronto.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(`[error] ${message}`, error ?? '', context ?? '')
  },
}
