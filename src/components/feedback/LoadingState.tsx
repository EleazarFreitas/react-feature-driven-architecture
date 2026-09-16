import { Spinner } from '@/components/ui/Spinner'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Carregando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <Spinner />
      {/* `role="status"` anuncia a mudança sem roubar o foco do usuário. */}
      <p role="status">{label}</p>
    </div>
  )
}
