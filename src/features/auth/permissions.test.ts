import { describe, expect, it } from 'vitest'

import { makeUser } from '@/test/fixtures'

import { can } from './permissions'

/**
 * Teste unitário puro: função sem dependências, sem React, sem rede.
 *
 * Regra de autorização é exatamente o tipo de código que compensa testar assim
 * — é uma tabela de decisão, e uma tabela se verifica exaustivamente em poucas
 * linhas. Cobrir isso pela interface exigiria renderizar três telas diferentes.
 */
describe('can()', () => {
  it('permite tudo para o administrador', () => {
    const admin = makeUser('admin')

    expect(can(admin, 'product:create')).toBe(true)
    expect(can(admin, 'product:update')).toBe(true)
    expect(can(admin, 'product:delete')).toBe(true)
  })

  it('permite criar e editar, mas não excluir, para o moderador', () => {
    const moderator = makeUser('moderator')

    expect(can(moderator, 'product:create')).toBe(true)
    expect(can(moderator, 'product:update')).toBe(true)
    // A distinção que justifica o papel existir: exclusão é irreversível.
    expect(can(moderator, 'product:delete')).toBe(false)
  })

  it('não permite nenhuma escrita para o papel somente leitura', () => {
    const reader = makeUser('user')

    expect(can(reader, 'product:create')).toBe(false)
    expect(can(reader, 'product:update')).toBe(false)
    expect(can(reader, 'product:delete')).toBe(false)
  })

  it('não permite nada quando não há usuário', () => {
    // Caso de borda que importa: durante o logout o usuário vira null por um
    // instante, e a interface não pode oferecer ações nesse meio-tempo.
    expect(can(null, 'product:create')).toBe(false)
  })
})
