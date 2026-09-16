interface ProgressBarProps {
  /** 0 a 100. */
  percent: number
  /** Descreve o que está progredindo, para leitores de tela. */
  label: string
}

/**
 * Barra de progresso acessível.
 *
 * Uma `<div>` que só fica mais larga é invisível para quem usa leitor de tela.
 * O papel `progressbar` com `aria-valuenow/min/max` faz a tecnologia assistiva
 * anunciar "35 por cento" — é o que transforma o desenho em informação.
 *
 * `aria-valuetext` não é usado porque o valor é uma porcentagem simples, que os
 * leitores já anunciam corretamente a partir de `aria-valuenow`.
 */
export function ProgressBar({ percent, label }: ProgressBarProps) {
  // Protege contra valores fora da faixa (um total errado geraria 120%).
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className="h-full bg-brand-600 transition-[width] duration-150"
        style={{ width: `${safePercent}%` }}
      />
    </div>
  )
}
