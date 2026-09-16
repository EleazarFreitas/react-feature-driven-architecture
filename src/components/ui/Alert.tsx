import type { ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: 'bg-red-50 text-red-900 border-red-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200',
  success: 'bg-green-50 text-green-900 border-green-200',
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  // `role="alert"` faz o leitor de tela anunciar a mensagem assim que ela
  // aparece. Reservado para erros/avisos: usar em tudo vira poluição sonora.
  const isAssertive = variant === 'error' || variant === 'warning'

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      className={['rounded-md border p-4 text-sm', VARIANT_CLASSES[variant]].join(' ')}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  )
}
