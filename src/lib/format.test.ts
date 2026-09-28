import { describe, expect, it } from 'vitest'

import { formatCurrency, formatPercent } from './format'

/**
 * Formatação parece trivial, mas quebra de formas sutis (separador errado,
 * arredondamento, zero) — e o erro aparece em todas as telas.
 *
 * Regex em vez de string exata: o `Intl` usa espaço não separável (U+00A0)
 * entre símbolo e número, e comparar com espaço comum falharia por um motivo
 * que nada tem a ver com o nosso código.
 */
describe('formatCurrency', () => {
  // A DummyJSON define os preços em dólar; exibir "R$" seria mentira.
  it.each([
    [1299.9, /US\$\s?1\.299,90/],
    [0, /US\$\s?0,00/],
    [19.999, /US\$\s?20,00/],
  ])('formata %s no padrão brasileiro, em dólar', (value, expected) => {
    expect(formatCurrency(value)).toMatch(expected)
  })
})

describe('formatPercent', () => {
  // A API manda o desconto como 12.5, mas o Intl espera 0.125. Confundir os
  // dois (e exibir 1250%) é o erro clássico deste formatador.
  it.each([
    [12.5, /^12,5\s?%$/],
    [0, /^0\s?%$/],
  ])('exibe %s como percentual', (value, expected) => {
    expect(formatPercent(value)).toMatch(expected)
  })
})
