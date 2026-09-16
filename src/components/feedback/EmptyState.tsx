import type { ReactNode } from 'react'

/**
 * "Deu certo, mas não há nada para mostrar" é um estado DIFERENTE de carregando
 * e de erro — e é o mais esquecido. Sem ele o usuário vê uma tela em branco e
 * não sabe se o app quebrou, se ainda está carregando, ou se o filtro dele não
 * achou nada. Por isso aceitamos uma `action`: o estado vazio deve sugerir a
 * saída (limpar o filtro, criar o primeiro registro).
 */

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  )
}
