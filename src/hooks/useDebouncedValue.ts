import { useEffect, useState } from 'react'

/**
 * Devolve o valor só depois que ele parar de mudar por `delay` ms.
 *
 * Uso típico: campo de busca. Sem debounce, digitar "notebook" dispara oito
 * requisições — sete delas descartadas, todas consumindo rede e rate limit da
 * API. Com debounce, dispara uma.
 *
 * Mora em `src/hooks` (e não dentro de uma feature) porque não sabe nada sobre
 * produtos: serve para qualquer valor, em qualquer tela. Esse é o critério para
 * algo ser compartilhado — ser genuinamente genérico, e não apenas "usado em
 * dois lugares".
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)

    // A limpeza é o coração do debounce: cada nova tecla cancela o timer
    // anterior, então só o último sobrevive ao período de silêncio.
    return () => window.clearTimeout(timeout)
  }, [value, delay])

  return debounced
}
