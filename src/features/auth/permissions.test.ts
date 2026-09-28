import { describe, expect, it } from 'vitest'

import { makeUser } from '@/test/fixtures'

import { can, type Permission } from './permissions'

/**
 * Teste unitário puro: regra de autorização é uma tabela de decisão, e uma
 * tabela se verifica exaustivamente em poucas linhas. Pela interface, isso
 * exigiria renderizar três telas diferentes por papel — os testes das páginas
 * só confirmam que a tabela está LIGADA aos botões.
 */

const ALL: Permission[] = ['product:create', 'product:update', 'product:delete']

describe('can()', () => {
  it.each([
    { role: 'admin', allowed: ALL },
    // A distinção que justifica o papel existir: exclusão é irreversível.
    { role: 'moderator', allowed: ['product:create', 'product:update'] },
    { role: 'user', allowed: [] },
  ] as const)('libera ao papel $role exatamente as permissões dele', ({ role, allowed }) => {
    const user = makeUser(role)

    expect(ALL.filter((permission) => can(user, permission))).toEqual(allowed)
  })

  it('não permite nada quando não há usuário', () => {
    // Durante o logout o usuário vira null por um instante, e a interface não
    // pode oferecer ações nesse meio-tempo.
    expect(ALL.some((permission) => can(null, permission))).toBe(false)
  })
})
