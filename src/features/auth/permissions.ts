import type { AuthUser, Role } from './types/auth.types'

/**
 * Autorização — "o que este usuário PODE fazer".
 *
 * ⚠️ ISTO É REGRA DE INTERFACE, NÃO DE SEGURANÇA.
 * Esconder um botão evita que o usuário tente algo que vai falhar; não impede
 * ninguém de chamar a API direto pelo terminal. Quem precisa recusar a operação
 * é o BACKEND. O frontend inteiro é código na máquina do usuário: ele pode ser
 * lido, alterado e contornado.
 *
 * Neste projeto isso é literalmente verificável: a DummyJSON aceita
 * POST /products/add sem nenhum token. As permissões abaixo são uma simulação
 * didática do papel do backend (ver docs.md > Segurança).
 *
 * Modelamos PERMISSÕES em vez de checar papéis direto no componente. A diferença
 * na prática: `can(user, 'product:delete')` continua funcionando quando surgir
 * um papel novo, enquanto `user.role === 'admin'` espalhado por 10 arquivos
 * obriga a caçar e editar os 10.
 */

export type Permission = 'product:create' | 'product:update' | 'product:delete'

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['product:create', 'product:update', 'product:delete'],
  // Moderador edita e cria, mas não apaga: exclusão é destrutiva e irreversível.
  moderator: ['product:create', 'product:update'],
  // Papel padrão da maioria das contas da DummyJSON: somente leitura.
  user: [],
}

export function can(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false
  return ROLE_PERMISSIONS[user.role].includes(permission)
}

/** Rótulos em português para exibição. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  user: 'Somente leitura',
}
