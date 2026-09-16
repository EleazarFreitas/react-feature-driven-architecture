import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { resetAuthStore } from '@/features/auth/store/auth.store'

import { server } from './server'

/**
 * Configuração executada antes de cada arquivo de teste (ver vite.config.ts).
 */

beforeAll(() => {
  // `onUnhandledRequest: 'error'` é proposital: qualquer requisição sem handler
  // faz o teste FALHAR em vez de passar silenciosamente com dado indefinido.
  // É o que garante que nenhum teste dependa da internet de verdade.
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
  /**
   * A store de autenticação é um SINGLETON de módulo: ela sobrevive ao
   * `cleanup()`, que só desmonta a árvore React. Sem este reset, um teste de
   * login deixaria o próximo já autenticado — testes precisam ser independentes
   * e reordenáveis.
   *
   * O `localStorage.clear()` vem DEPOIS de propósito: o middleware `persist`
   * grava ao receber o reset, então limpar antes deixaria lixo para trás.
   */
  resetAuthStore()
  window.localStorage.clear()
  objectUrlTracker.reset()
})

afterAll(() => {
  server.close()
})

/**
 * Storage em memória para os testes.
 *
 * POR QUE ISTO É NECESSÁRIO (armadilha de ambiente, não do projeto):
 * o Node 25 passou a expor um `localStorage` global próprio. Como o ambiente
 * jsdom do Vitest não sobrescreve chaves que já existem no global, o
 * `localStorage` do jsdom (que funciona) acaba não sendo instalado, e sobra o
 * stub do Node — um objeto vazio, sem setItem/getItem.
 *
 * Isso afeta APENAS os testes. No navegador o localStorage é real.
 *
 * A implementação abaixo é um Storage de verdade, em memória: além de resolver
 * o problema, é o comportamento ideal para testes, já que cada arquivo começa
 * com o armazenamento limpo e isolado.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, String(value))
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }
}

if (typeof window.localStorage?.setItem !== 'function') {
  Object.defineProperty(window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}

/**
 * Shim de URL.createObjectURL / revokeObjectURL.
 *
 * Outra ausência do jsdom (como o <dialog>): ele não implementa object URLs.
 * O campo de imagem usa createObjectURL para mostrar a prévia sem esperar a
 * rede, então sem este shim os testes desse campo nem renderizariam.
 *
 * Devolvemos uma string "blob:" previsível e contamos as revogações — assim um
 * teste consegue verificar que a memória foi liberada, que é justamente o erro
 * fácil de cometer nesse fluxo.
 *
 * Substituímos SEMPRE, mesmo quando o jsdom já oferece a função: a
 * implementação nativa funciona, mas não nos deixa contar as revogações. Como
 * o objetivo aqui é conseguir afirmar "a memória foi liberada", o controle
 * precisa ser nosso.
 */
let objectUrlCounter = 0
export const objectUrlTracker = {
  created: [] as string[],
  revoked: [] as string[],
  reset() {
    this.created = []
    this.revoked = []
  },
}

URL.createObjectURL = (): string => {
  objectUrlCounter += 1
  const url = `blob:mock/${objectUrlCounter}`
  objectUrlTracker.created.push(url)
  return url
}

URL.revokeObjectURL = (url: string): void => {
  objectUrlTracker.revoked.push(url)
}

/**
 * Shim do <dialog> nativo.
 *
 * O jsdom ainda não implementa showModal()/close() (verificado nesta versão).
 * Como o ConfirmDialog usa <dialog> de propósito — para ganhar foco preso e
 * fechamento com Escape de graça no navegador real — adicionamos aqui o mínimo
 * para o componente funcionar nos testes.
 *
 * O shim cobre o CONTRATO que o componente usa (abrir, fechar, disparar o
 * evento "close"), não o comportamento visual do navegador.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
