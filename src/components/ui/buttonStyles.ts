/**
 * Classes compartilhadas por <Button> e <LinkButton>.
 *
 * Por que um arquivo só para isto: um botão e um link precisam PARECER iguais,
 * mas são elementos HTML diferentes e não intercambiáveis — <button> executa
 * uma ação, <a> navega para outro lugar. Usar o elemento errado quebra o
 * comportamento esperado (abrir em nova aba, arrastar o link, o leitor de tela
 * anunciar "link" e não "botão").
 *
 * A solução é compartilhar o ESTILO e manter a SEMÂNTICA separada. Ficar num
 * módulo próprio (e não exportado do Button.tsx) também mantém o Fast Refresh
 * funcionando, já que arquivos de componente devem exportar só componentes.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const BASE_CLASSES = [
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2',
  'text-sm font-medium transition-colors no-underline',
  // `focus-visible` mostra o anel de foco apenas na navegação por teclado —
  // acessível para quem usa Tab, sem poluir o clique do mouse.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ')

export function buttonClasses(variant: ButtonVariant, extra = ''): string {
  return [BASE_CLASSES, VARIANT_CLASSES[variant], extra].join(' ')
}
