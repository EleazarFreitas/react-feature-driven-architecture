import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { buttonClasses, type ButtonVariant } from './buttonStyles'

/**
 * Um LINK com aparência de botão.
 *
 * A regra: se a ação leva para outra URL, é <a> (aqui, o <Link> do React
 * Router). Se executa algo na tela atual, é <button>. Um <button onClick={() =>
 * navigate(...)}> parece igual, mas o usuário perde abrir em nova aba, copiar
 * o endereço e ver o destino na barra de status — e o leitor de tela anuncia a
 * coisa errada.
 */

interface LinkButtonProps {
  to: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}

export function LinkButton({ to, variant = 'primary', className = '', children }: LinkButtonProps) {
  return (
    <Link to={to} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  )
}
