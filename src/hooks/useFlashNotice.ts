import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

/**
 * Mensagem "de passagem" entre duas telas.
 *
 * Quem navega deixa o aviso no estado da navegação:
 *
 *   navigate(ROUTES.products, { state: { notice: 'Produto criado.' } })
 *
 * e a tela de destino o lê com este hook. É o jeito mais simples de dizer "deu
 * certo" depois de um redirecionamento, sem store global nem biblioteca de toast.
 *
 * O hook também APAGA o aviso do histórico. `location.state` é gravado na
 * entrada do histórico do navegador e sobrevive ao F5: sem a limpeza, "Produto
 * criado" reapareceria ao recarregar a página — como se a ação tivesse
 * acontecido de novo.
 */
export function useFlashNotice(): string | null {
  const location = useLocation()
  const navigate = useNavigate()

  const incoming = readNotice(location.state)

  // Copiamos para um estado local para o aviso continuar na tela depois que o
  // efeito abaixo o remover do histórico.
  const [notice] = useState(incoming)

  useEffect(() => {
    if (incoming === null) return

    // Mesma URL, sem o state. `replace` troca a entrada atual do histórico em
    // vez de criar outra. Depois disso `incoming` passa a ser null e o efeito
    // não faz mais nada.
    navigate({ pathname: location.pathname, search: location.search }, { replace: true })
  }, [incoming, location.pathname, location.search, navigate])

  return notice
}

/** `location.state` é `unknown`: conferimos o formato em vez de confiar num `as`. */
function readNotice(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'notice' in state) {
    return typeof state.notice === 'string' ? state.notice : null
  }
  return null
}
