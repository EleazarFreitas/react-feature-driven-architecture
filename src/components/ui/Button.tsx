import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { buttonClasses, type ButtonVariant } from './buttonStyles'
import { Spinner } from './Spinner'

/**
 * Extraído porque botão aparece em toda tela e três coisas PRECISAM ser
 * consistentes: aparência, o estado de carregando e o foco visível do teclado.
 * Sem um componente, cada tela reinventaria (mal) as três.
 *
 * Para NAVEGAR com aparência de botão, use <LinkButton> — um <button> que
 * navega quebra o comportamento nativo dos links.
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Mostra spinner e bloqueia cliques — evita envio duplicado de formulário. */
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // Default `type="button"`: sem isso, todo botão dentro de um <form>
      // submete o formulário sem querer. É uma das pegadinhas mais comuns do HTML.
      type={type}
      /**
       * `||` e não `??`: o botão fica desabilitado se foi pedido explicitamente
       * OU se está carregando.
       *
       * Com `??` (que só cai no fallback quando o valor é null/undefined),
       * passar `disabled={false}` — o caso comum de uma expressão booleana —
       * anulava silenciosamente o `isLoading`, e o botão continuava clicável
       * durante o envio. Foi um bug real, pego por teste.
       */
      disabled={disabled || isLoading}
      // `aria-busy` avisa leitores de tela que a ação está em andamento.
      aria-busy={isLoading}
      className={buttonClasses(variant, className)}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
