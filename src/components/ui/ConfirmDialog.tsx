import { useEffect, useId, useRef } from 'react'

import { Button } from './Button'

/**
 * Diálogo de confirmação para ações destrutivas.
 *
 * Usamos o <dialog> NATIVO do HTML em vez de montar um modal com <div>.
 * Chamando `showModal()`, o navegador entrega de graça:
 *   - foco preso dentro do modal (não dá para tabular para trás da máscara);
 *   - fechar com Escape;
 *   - o resto da página fica inerte para leitores de tela;
 *   - backdrop e renderização na top-layer (sem guerra de z-index).
 *
 * Refazer isso à mão com `role="dialog"` + listeners é dezenas de linhas que
 * quase sempre saem com algum bug de foco. É o exemplo prático da regra
 * "prefira HTML semântico a ARIA".
 *
 * Observação: o jsdom (ambiente dos testes) ainda não implementa `showModal`;
 * há um shim mínimo em `src/test/polyfills.ts`.
 */

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    // Checamos `dialog.open` antes de agir: chamar showModal() num dialog já
    // aberto lança InvalidStateError.
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      // Disparado também quando o usuário fecha com Escape, então o estado do
      // pai continua sincronizado sem precisarmos ouvir o teclado.
      onClose={onCancel}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,90vw)] rounded-lg p-6 shadow-xl backdrop:bg-slate-900/50"
    >
      <h2 id={titleId} className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isConfirming}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
