import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'

/**
 * Campos de formulário com rótulo e erro acessíveis.
 *
 * ESTE É O PONTO DIDÁTICO DO ARQUIVO. Um input acessível precisa de quatro
 * ligações que é fácil esquecer quando se escreve <input> solto:
 *
 *   1. <label for> ligado ao id do input — clicar no rótulo foca o campo e o
 *      leitor de tela anuncia o nome correto;
 *   2. aria-invalid — comunica o estado de erro;
 *   3. aria-describedby apontando para a mensagem de erro — o leitor de tela
 *      lê o MOTIVO do erro, não só "inválido";
 *   4. role="alert" na mensagem — anuncia assim que ela aparece.
 *
 * Encapsular isso num componente é o que garante que nenhuma tela esqueça.
 * O `useId` do React gera ids únicos e estáveis (seguro com SSR).
 *
 * `React.forwardRef` não é necessário: no React 19 `ref` é uma prop normal, e o
 * React Hook Form precisa dela para registrar campos não controlados.
 */

interface FieldWrapperProps {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
}

function FieldWrapper({ id, label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/** Junta os ids de descrição, omitindo os que não existem. */
function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

const CONTROL_CLASSES = [
  'rounded-md border px-3 py-2 text-sm text-slate-900 bg-white',
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-600',
  'disabled:bg-slate-100 disabled:text-slate-500',
].join(' ')

const ERROR_BORDER = 'border-red-500'
const NORMAL_BORDER = 'border-slate-300'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export function Input({ label, error, hint, className = '', ...rest }: InputProps) {
  const id = useId()

  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={[CONTROL_CLASSES, error ? ERROR_BORDER : NORMAL_BORDER, className].join(' ')}
        {...rest}
      />
    </FieldWrapper>
  )
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export function Textarea({ label, error, hint, className = '', ...rest }: TextareaProps) {
  const id = useId()

  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={[CONTROL_CLASSES, error ? ERROR_BORDER : NORMAL_BORDER, className].join(' ')}
        {...rest}
      />
    </FieldWrapper>
  )
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
}

export function Select({ label, error, hint, className = '', children, ...rest }: SelectProps) {
  const id = useId()

  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={[CONTROL_CLASSES, error ? ERROR_BORDER : NORMAL_BORDER, className].join(' ')}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  )
}
