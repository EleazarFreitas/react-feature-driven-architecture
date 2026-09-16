import { LoadingState } from './LoadingState'

/**
 * Carregamento que ocupa a tela inteira.
 *
 * Extraído quando o segundo caso de uso apareceu (o AuthProvider verificando a
 * sessão e o router baixando o primeiro chunk). Antes disso era markup local —
 * é o critério de sempre: extrair quando a repetição existe de fato.
 */
export function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState label={label} />
    </div>
  )
}
