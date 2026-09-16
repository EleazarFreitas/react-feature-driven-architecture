interface SpinnerProps {
  size?: 'sm' | 'md'
  /** Descrição para leitores de tela. Use null quando houver texto ao lado. */
  label?: string | null
}

export function Spinner({ size = 'md', label = null }: SpinnerProps) {
  return (
    <>
      <span
        // `aria-hidden`: é decoração pura. A informação vai no texto abaixo.
        aria-hidden="true"
        className={[
          'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
          size === 'sm' ? 'h-4 w-4' : 'h-8 w-8',
        ].join(' ')}
      />
      {label !== null && <span className="sr-only">{label}</span>}
    </>
  )
}
