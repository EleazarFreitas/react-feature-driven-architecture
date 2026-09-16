import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'danger'
}

const TONE_CLASSES = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
} as const

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
