import { useId, useState, type DragEvent, type ChangeEvent } from 'react'

/**
 * Área para escolher um arquivo, clicando ou arrastando.
 *
 * ACESSIBILIDADE — a parte que quase todo dropzone da internet erra:
 *
 * O caminho comum é uma <div onClick> que dispara `inputRef.current.click()`,
 * com o <input> escondido por `display: none`. Isso quebra três coisas:
 * `display: none` TIRA o input da ordem de tabulação, uma <div> não é focável
 * nem anunciada como campo, e o leitor de tela não encontra controle nenhum.
 *
 * Aqui fazemos o contrário: o <input type="file"> REAL continua no documento,
 * apenas escondido visualmente (`sr-only`, que preserva o foco), e um <label>
 * ligado a ele forma a área grande. Com isso ganhamos de graça, sem uma linha
 * de ARIA: clicar no rótulo abre o seletor, Tab foca o campo, Espaço/Enter abre
 * o seletor, e o leitor de tela anuncia "Imagem do produto, botão de arquivo".
 *
 * Arrastar-e-soltar é um ACRÉSCIMO por cima disso — nunca a única forma de
 * enviar, porque não há como arrastar um arquivo usando só o teclado.
 */

interface FileDropzoneProps {
  /** Nome do campo — vira o nome acessível do input. */
  label: string
  /** Texto auxiliar (formatos e tamanho aceitos). */
  hint?: string
  /** Ex.: "image/png,image/jpeg". Dica para o seletor, NÃO validação. */
  accept: string
  onFileSelected: (file: File) => void
  disabled?: boolean
  error?: string
}

export function FileDropzone({
  label,
  hint,
  accept,
  onFileSelected,
  disabled = false,
  error,
}: FileDropzoneProps) {
  const inputId = useId()
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`]
    .filter(Boolean)
    .join(' ')

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onFileSelected(file)

    /**
     * ARMADILHA: limpar o valor depois de ler.
     *
     * Sem isto, o usuário que escolhe "foto.png", remove e escolhe "foto.png"
     * de novo NÃO dispara `change` — o valor do input não mudou, então o
     * navegador não vê evento algum. Zerar o valor faz a próxima escolha
     * sempre contar, mesmo sendo o mesmo arquivo.
     */
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    if (disabled) return

    // Só um arquivo: se arrastarem vários, usamos o primeiro (ver ProductImageField).
    const file = event.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        /**
         * `onDragOver` PRECISA chamar preventDefault. O padrão do navegador é
         * recusar o drop; sem isso, soltar o arquivo faz a página navegar até
         * ele — e o usuário perde tudo que já preencheu no formulário.
         */
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg',
          'border-2 border-dashed px-4 py-8 text-center transition-colors',
          // `focus-within` é o que dá foco visível: o input está escondido, mas
          // quem navega por teclado precisa enxergar onde está.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : isDraggingOver
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-600 hover:border-brand-600',
        ].join(' ')}
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm" aria-hidden="true">
          Arraste uma imagem aqui ou clique para escolher
        </span>
        {hint && (
          <span id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </span>
        )}

        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          // `sr-only` esconde visualmente MAS mantém o elemento focável —
          // diferente de `hidden` ou `display: none`.
          className="sr-only"
        />
      </label>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
