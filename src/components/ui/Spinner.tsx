interface SpinnerProps {
  size?: 'sm' | 'md'
}

/**
 * Indicador visual de carregamento.
 *
 * `aria-hidden`: é decoração pura. Quem dá a informação a leitores de tela é o
 * texto que o acompanha (ver LoadingState) ou o `aria-busy` do botão.
 */
export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        size === 'sm' ? 'h-4 w-4' : 'h-8 w-8',
      ].join(' ')}
    />
  )
}
