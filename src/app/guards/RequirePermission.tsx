import { Navigate, Outlet } from 'react-router'

import { ROUTES } from '@/config/paths'
import { type Permission } from '@/features/auth/permissions'
import { useHasPermission } from '@/features/auth/store/auth.store'

/**
 * Autorização por PERMISSÃO (não por papel).
 *
 * AUTENTICAÇÃO x AUTORIZAÇÃO — a distinção que este par de guardas materializa:
 *   - RequireAuth       = "quem é você?"  → sem sessão, vai para /login;
 *   - RequirePermission = "você pode?"    → logado mas sem direito, vai para /403.
 *
 * Redirecionar para /login quem já está logado seria confuso ("mas eu ENTREI");
 * por isso os destinos são diferentes.
 *
 * Recebemos uma permissão em vez de uma lista de papéis para que a regra viva
 * num lugar só (features/auth/permissions.ts). Criar um papel novo não obriga a
 * revisitar o arquivo de rotas.
 *
 * Vale o mesmo aviso do RequireAuth: isto é UX, não segurança. O backend é quem
 * tem de recusar a operação.
 */

interface RequirePermissionProps {
  permission: Permission
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const isAllowed = useHasPermission(permission)

  if (!isAllowed) {
    return <Navigate to={ROUTES.forbidden} replace />
  }

  return <Outlet />
}
