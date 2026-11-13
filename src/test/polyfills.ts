/**
 * Ajustes do AMBIENTE de teste (jsdom) — carregado ANTES de tudo.
 *
 * A ordem em `setupFiles` (vite.config.ts) importa: este arquivo precisa rodar
 * antes de qualquer módulo da aplicação ser importado, porque a store de sessão
 * lê o `localStorage` no instante em que é carregada.
 *
 * Nada aqui existe por causa do app: são lacunas do ambiente de teste. No
 * navegador, as três APIs abaixo são nativas.
 */

/**
 * 1. `localStorage` em memória.
 *
 * O Node 25 passou a expor um `localStorage` global próprio, que sem
 * configuração é um objeto vazio (sem getItem/setItem). Como o ambiente jsdom
 * do Vitest não sobrescreve chaves que já existem no global, o `localStorage`
 * do jsdom — que funciona — acaba não sendo instalado. Em versões anteriores do
 * Node o `if` abaixo é falso e nada acontece.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value))
    },
    removeItem: (key) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }
}

if (typeof globalThis.localStorage?.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}

/**
 * 2. `URL.createObjectURL` / `revokeObjectURL` rastreáveis.
 *
 * O campo de imagem cria um object URL para mostrar a prévia sem esperar a
 * rede, e PRECISA revogá-lo depois (senão o arquivo fica preso na memória).
 * Trocamos as duas funções por versões que anotam o que foi criado e revogado:
 * assim um teste consegue afirmar "a memória foi liberada", que é justamente o
 * erro fácil de cometer nesse fluxo.
 */
export const objectUrlTracker = {
  created: [] as string[],
  revoked: [] as string[],
  reset() {
    this.created = []
    this.revoked = []
  },
}

URL.createObjectURL = () => {
  const url = `blob:mock/${objectUrlTracker.created.length + 1}`
  objectUrlTracker.created.push(url)
  return url
}

URL.revokeObjectURL = (url) => {
  objectUrlTracker.revoked.push(url)
}

/**
 * 3. `<dialog>` nativo.
 *
 * O jsdom ainda não implementa showModal()/close(). Como o ConfirmDialog usa
 * <dialog> de propósito — para ganhar foco preso e fechamento com Escape de
 * graça no navegador real — adicionamos o mínimo para ele funcionar nos testes.
 *
 * O shim cobre o CONTRATO que o componente usa (abrir, fechar, disparar o
 * evento "close"), não o comportamento visual do navegador.
 */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
