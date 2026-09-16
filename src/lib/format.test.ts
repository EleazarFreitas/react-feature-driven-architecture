import { describe, expect, it } from 'vitest'

import { formatCurrency, formatPercent } from './format'

/**
 * Formatação parece trivial, mas quebra de formas sutis (separador errado,
 * arredondamento, zero). São testes de dois segundos que evitam um bug visível
 * em todas as telas.
 *
 * Usamos regex em vez de comparar a string exata porque o `Intl` usa espaço
 * não separável (U+00A0) entre símbolo e número — comparar com espaço comum
 * falharia por um motivo que nada tem a ver com o nosso código.
 */
describe('formatCurrency', () => {
  it('formata no padrão brasileiro, com símbolo de dólar', () => {
    // A DummyJSON define os preços em dólar; exibir "R$" seria mentira.
    expect(formatCurrency(1299.9)).toMatch(/US\$\s?1\.299,90/)
  })

  it('formata zero sem quebrar', () => {
    expect(formatCurrency(0)).toMatch(/US\$\s?0,00/)
  })

  it('arredonda para duas casas decimais', () => {
    expect(formatCurrency(19.999)).toMatch(/20,00/)
  })
})

describe('formatPercent', () => {
  it('recebe 12.5 e exibe 12,5% (e não 1250%)', () => {
    // A API manda o desconto como 12.5, mas o Intl espera 0.125. Confundir os
    // dois é o erro clássico deste formatador — daí o teste.
    expect(formatPercent(12.5)).toMatch(/12,5\s?%/)
  })

  it('formata desconto zerado', () => {
    expect(formatPercent(0)).toMatch(/0\s?%/)
  })
})
