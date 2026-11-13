import { ROUTES } from '@/config/paths'
import { LinkButton } from '@/components/ui/LinkButton'

/**
 * 404 — a URL não corresponde a nenhuma rota.
 *
 * Vive em `src/pages` (e não numa feature) porque não pertence a domínio
 * nenhum: é uma tela da aplicação. A regra deste diretório é essa — páginas
 * transversais, que não são de produtos nem de autenticação.
 */
export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="max-w-md text-sm text-slate-500">
        O endereço acessado não existe ou foi movido.
      </p>
      <LinkButton to={ROUTES.products}>Ir para os produtos</LinkButton>
    </main>
  )
}
