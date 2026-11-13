/**
 * Tipos de erro da aplicação.
 *
 * Por que classes de erro em vez de strings soltas? Porque o componente que
 * exibe o erro precisa DECIDIR algo com base nele (mostrar "não autorizado",
 * oferecer "tentar novamente"). Comparar strings de mensagem para tomar decisão
 * é frágil; `instanceof` + status é explícito e o TypeScript estreita o tipo.
 *
 * O `name` de cada classe é escrito por extenso (e não lido de
 * `this.constructor.name`) porque o build de produção minifica os nomes das
 * classes: no log, um `NetworkError` apareceria como "t".
 */

/**
 * Base dos erros que a aplicação cria conscientemente. A mensagem de um
 * `AppError` é sempre um texto NOSSO, escrito para o usuário final — é essa
 * garantia que permite a `getErrorMessage` exibi-la sem medo.
 */
export class AppError extends Error {
  override name = 'AppError'
}

/**
 * A requisição nem chegou a receber resposta: offline, DNS, CORS.
 * Diferente de um 500 — aqui não há status HTTP para inspecionar.
 */
export class NetworkError extends AppError {
  override name = 'NetworkError'

  constructor(cause?: unknown) {
    super('Não foi possível conectar à API. Verifique sua conexão.', { cause })
  }
}

/** A resposta chegou, mas com status fora da faixa 2xx. */
export class HttpError extends AppError {
  override name = 'HttpError'

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
  override name = 'SessionExpiredError'

  constructor() {
    super('Sua sessão expirou. Faça login novamente.')
  }
}

/**
 * Traduz QUALQUER valor capturado para uma mensagem exibível.
 *
 * Existe porque um erro capturado é `unknown` — pode ser um erro nosso, um
 * `ZodError` de uma resposta fora do formato, um `TypeError` de um bug, ou
 * qualquer coisa que alguém tenha feito `throw`. Centralizar a tradução mantém
 * o texto consistente e impede que detalhe técnico chegue à tela.
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

  // Tudo que não é erro NOSSO cai aqui de propósito. A mensagem de um erro
  // desconhecido foi escrita para desenvolvedores (a de um ZodError é um JSON
  // com a lista de campos inválidos) — ela vai para o log, não para o usuário.
  return 'Ocorreu um erro inesperado.'
}

/**
 * Erros de rede/servidor valem uma nova tentativa; erros 4xx não, porque a
 * requisição continuará inválida. Usado para decidir se mostramos "Tentar
 * novamente" na UI e se o TanStack Query repete a busca sozinho.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  if (error instanceof HttpError) return !error.isClientError
  return false
}
