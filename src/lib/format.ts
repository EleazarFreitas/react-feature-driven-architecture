/**
 * Formatadores de exibição.
 *
 * `Intl` já vem no navegador: não precisamos de date-fns/numeral para isto.
 * Criamos os formatadores fora das funções porque instanciar `Intl.NumberFormat`
 * é relativamente caro e essas funções são chamadas dentro de listas.
 */

// A DummyJSON devolve preços em dólar, então formatamos como USD — seria
// mentira exibir "R$" sobre um valor que a API define em outra moeda.
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** Recebe 12.5 (e não 0.125), que é como a DummyJSON expõe o desconto. */
export function formatPercent(value: number): string {
  return percentFormatter.format(value / 100)
}
