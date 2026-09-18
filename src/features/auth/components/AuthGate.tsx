import { type ReactNode, useEffect } from 'react'

import { FullPageLoading } from '@/components/feedback/FullPageLoading'

import { useAuthStore } from '../store/auth.store'

/**
 * Resolve a sessão antes de deixar a aplicação renderizar.
 *
 * Ele não FORNECE nada (a store é global e acessível de qualquer lugar), apenas
 * cuida do momento do BOOT. Por isso é um componente pequeno e descartável, não
 * um provider do qual a árvore inteira depende.
 *
 * POR QUE AINDA EXISTE UMA TELA DE ESPERA: o token sobrevive ao F5, mas os dados
 * do usuário não — eles estavam só na memória do JavaScript. Enquanto
 * perguntamos à API quem é o dono do token, não dá para saber se o usuário está
 * logado. Renderizar o app agora causaria o bug clássico: a rota protegida veria
 * "não autenticado", redirecionaria para o login, e um instante depois a sessão
 * seria restaurada — um flash de tela de login a cada F5.
 *
 * POR QUE O /auth/me NÃO É UM useQuery: ele não alimenta uma tela, e sim uma
 * máquina de estados de sessão que precisa existir ANTES de qualquer tela (as
 * guardas de rota leem dela). Manter a sessão na store e o resto dos dados no
 * TanStack Query mantém uma única fonte da verdade para cada coisa.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const restoreSession = useAuthStore((state) => state.restoreSession)

  useEffect(() => {
    // A própria action decide se há algo a restaurar e ignora chamadas
    // concorrentes — por isso é seguro no StrictMode, que monta duas vezes.
    void restoreSession()
  }, [restoreSession])

  if (status === 'loading') {
    return <FullPageLoading label="Verificando sessão..." />
  }

  return <>{children}</>
}
