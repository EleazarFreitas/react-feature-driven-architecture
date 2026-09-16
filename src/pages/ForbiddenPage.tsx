import { ROUTES } from '@/app/paths'
import { LinkButton } from '@/components/ui/LinkButton'

/**
 * 403 — autenticado, porém sem permissão.
 *
 * Por que uma tela separada do 404 e do login: as três dizem coisas diferentes.
 *   - 404: "isto não existe";
 *   - login: "não sei quem você é";
 *   - 403: "sei quem você é, e você não pode".
 * Mandar para o login quem já está logado gera a confusão clássica de o usuário
 * entrar de novo e cair no mesmo lugar.
 */
export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-5xl font-bold text-slate-300">403</p>
      <h1 className="text-xl font-semibold text-slate-900">Acesso negado</h1>
      <p className="max-w-md text-sm text-slate-500">
        Seu perfil não tem permissão para acessar esta página. Se acredita que isso é um engano,
        fale com um administrador.
      </p>
      <LinkButton to={ROUTES.products}>Voltar para os produtos</LinkButton>
    </div>
  )
}
