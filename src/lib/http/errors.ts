/**
 * Tipos de erro da aplicação.
 *
 * Por que classes de erro em vez de strings soltas? Porque o componente que
 * exibe o erro precisa DECIDIR algo com base nele (mostrar "não autorizado",
 * oferecer "tentar novamente", destacar um campo do formulário). Comparar
 * strings de mensagem para tomar decisão é frágil; `instanceof` + código é
 * explícito e o TypeScript consegue estreitar o tipo.
 */

/** Base de todos os erros que a aplicação cria conscientemente. */
export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
  }
}

/**
 * A requisição nem chegou a receber resposta: offline, DNS, CORS, timeout.
 * Diferente de um 500 — aqui não há status HTTP para inspecionar.
 */
export class NetworkError extends AppError {
  constructor(cause?: unknown) {
    super('Não foi possível conectar à API. Verifique sua conexão.', { cause })
  }
}

/** A resposta chegou, mas com status fora da faixa 2xx. */
export class HttpError extends AppError {
  readonly status: number
  /** Corpo já parseado, quando era JSON. Útil para depurar no DevTools. */
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }

  /** 401 — não sabemos quem é você (token ausente, inválido ou expirado). */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** 403 — sabemos quem é você, mas você não pode fazer isso. */
  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** 4xx: o cliente errou (dados inválidos). Repetir a mesma requisição não ajuda. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

/**
 * A sessão acabou e não foi possível renovar. É um caso separado de 401 porque
 * dispara uma AÇÃO (deslogar e mandar para o login), não apenas uma mensagem.
 */
export class SessionExpiredError extends AppError {
  constructor() {
    super('Sua sessão expirou. Faça login novamente.')
  }
}

/**
 * Traduz QUALQUER valor capturado em `catch` para uma mensagem exibível.
 *
 * Existe porque `catch (error)` em TypeScript dá `unknown` — pode ser um Error,
 * uma string, ou qualquer coisa que alguém tenha feito `throw`. Centralizar a
 * tradução evita repetir essa checagem em cada componente e mantém o texto
 * consistente para o usuário.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    // Mensagens específicas por status têm prioridade sobre o texto cru da API,
    // que costuma ser técnico demais para o usuário final.
    if (error.isUnauthorized) return 'Sessão inválida ou expirada. Faça login novamente.'
    if (error.isForbidden) return 'Você não tem permissão para realizar esta ação.'
    if (error.isNotFound) return 'Registro não encontrado.'
    if (error.status >= 500) return 'A API está indisponível no momento. Tente novamente.'
    return error.message
  }

  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message

  return 'Ocorreu um erro inesperado.'
}

/**
 * Erros de rede/servidor valem uma nova tentativa; erros 4xx não, porque a
 * requisição continuará inválida. Usado para decidir se mostramos "Tentar
 * novamente" na UI.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  if (error instanceof HttpError) return !error.isClientError
  return false
}
