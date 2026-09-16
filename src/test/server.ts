import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/**
 * Servidor falso usado por todos os testes.
 *
 * `server.use(...)` dentro de um teste sobrescreve um handler só para ele —
 * é assim que simulamos erro 500, 401 ou lista vazia em cenários específicos.
 * O `resetHandlers()` no setup desfaz essas sobrescritas depois de cada teste,
 * garantindo que um teste não contamine o outro.
 */
export const server = setupServer(...handlers)
