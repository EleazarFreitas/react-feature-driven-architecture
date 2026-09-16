import { Button } from './Button'

/**
 * Paginação "anterior / próxima".
 *
 * Fica em `components/ui` (e não dentro da feature de produtos) porque não sabe
 * nada sobre produtos: recebe números e devolve eventos. Qualquer listagem
 * futura usa o mesmo componente.
 *
 * Por que não uma paginação numerada (1 2 3 ... 17)? Porque ela exige lógica de
 * reticências, foco e responsividade para resolver um problema que este app não
 * tem. Se surgir a necessidade real de pular para uma página distante, troca-se
 * este componente — a interface (`page`, `totalPages`, `onPageChange`)
 * continua a mesma.
 */

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Evita navegar enquanto a página atual ainda está carregando. */
  isDisabled?: boolean
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  isDisabled = false,
}: PaginationProps) {
  // Com uma página só não há o que paginar: mostrar controles inertes é ruído.
  if (totalPages <= 1) return null

  const isFirst = page <= 1
  const isLast = page >= totalPages

  return (
    // <nav> + aria-label: o elemento marca a região, o rótulo a diferencia do
    // menu principal para quem navega por marcos.
    <nav aria-label="Paginação" className="flex items-center justify-center gap-4">
      <Button
        variant="secondary"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst || isDisabled}
      >
        Anterior
      </Button>

      {/*
        `aria-live="polite"` faz o leitor de tela anunciar a mudança de página.
        Sem isso, quem não enxerga clica em "Próxima" e não recebe confirmação
        nenhuma de que algo aconteceu.
      */}
      <span aria-live="polite" className="text-sm text-slate-600">
        Página <strong>{page}</strong> de <strong>{totalPages}</strong>
      </span>

      <Button
        variant="secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={isLast || isDisabled}
      >
        Próxima
      </Button>
    </nav>
  )
}
