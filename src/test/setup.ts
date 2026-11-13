import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { useAuthStore } from '@/features/auth/store/auth.store'

import { objectUrlTracker } from './polyfills'
import { server } from './server'

/**
 * Ciclo de vida comum a todos os testes (ver `setupFiles` em vite.config.ts).
 * As lacunas do jsdom são cobertas antes, em ./polyfills.ts.
 */

beforeAll(() => {
  // `onUnhandledRequest: 'error'` é proposital: qualquer requisição sem handler
  // faz o teste FALHAR em vez de passar silenciosamente com dado indefinido.
  // É o que garante que nenhum teste dependa da internet de verdade.
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  // Desfaz os `server.use(...)` do teste e desmonta a árvore React.
  server.resetHandlers()
  cleanup()

  /**
   * A store de autenticação é um SINGLETON de módulo: ela sobrevive ao
   * `cleanup()`, que só desmonta a árvore React. Sem este reset, um teste de
   * login deixaria o próximo já autenticado — testes precisam ser independentes
   * e reordenáveis.
   *
   * `getInitialState()` é do próprio Zustand: devolve o estado com que a store
   * foi criada. O `localStorage.clear()` vem DEPOIS de propósito: o middleware
   * `persist` grava ao receber o reset, então limpar antes deixaria lixo.
   */
  useAuthStore.setState(useAuthStore.getInitialState())
  localStorage.clear()
  objectUrlTracker.reset()
})

afterAll(() => {
  server.close()
})
