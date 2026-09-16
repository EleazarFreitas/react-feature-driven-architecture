import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

import './index.css'

/**
 * Ponto de entrada. Só existe para ligar o React ao DOM — toda a composição da
 * aplicação está em `app/App.tsx`, o que mantém este arquivo trivial.
 */
const container = document.getElementById('root')

// Falha explícita em vez de um `!`. Se o index.html mudar e a div sumir, a
// mensagem diz exatamente qual é o problema.
if (!container) {
  throw new Error('Elemento #root não encontrado no index.html')
}

createRoot(container).render(
  /**
   * StrictMode roda efeitos DUAS VEZES em desenvolvimento (e só nele). Não é
   * bug: é uma checagem proposital que revela efeitos sem limpeza adequada.
   * Se algo se comporta estranho no dev e "some" no build, geralmente é um
   * efeito que precisa de cleanup — e é exatamente o que o StrictMode denuncia.
   */
  <StrictMode>
    <App />
  </StrictMode>,
)
