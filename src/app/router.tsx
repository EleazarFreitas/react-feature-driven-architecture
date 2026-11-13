import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'

import { RequireAuth } from '@/app/guards/RequireAuth'
import { RequirePermission } from '@/app/guards/RequirePermission'
import { AppLayout } from '@/app/layout/AppLayout'
import { FullPageLoading } from '@/components/feedback/FullPageLoading'
import { ROUTES } from '@/config/paths'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

/**
 * Mapa de rotas da aplicação.
 *
 * A árvore é ANINHADA de propósito, e é isso que faz a proteção ser difícil de
 * esquecer:
 *
 *   (raiz sem path)            ← resolve a sessão, trata erro, mostra o carregando
 *     /login                   pública
 *     <RequireAuth>            ← exige sessão para tudo abaixo
 *       <AppLayout>            ← cabeçalho e navegação
 *         /products            lista
 *         /products/new        + exige a permissão product:create
 *         /products/:id        detalhe
 *         /products/:id/edit   + exige a permissão product:update
 *         /403                 sem permissão
 *     *                        404
 *
 * Uma página nova criada dentro do ramo protegido já nasce protegida — não
 * existe o risco de esquecer de embrulhá-la numa guarda.
 *
 * CODE SPLITTING: as páginas usam `lazy`, então viram arquivos JavaScript
 * separados, baixados só quando a rota é visitada. Divisão por rota é o tipo de
 * divisão que quase sempre compensa — o limite é natural e coincide com o que o
 * usuário faz. Num app deste tamanho o ganho é pequeno; o padrão está aqui
 * porque é o que escala quando a aplicação cresce.
 *
 * Não usamos `lazy` em 403/404: são componentes minúsculos e uma requisição
 * extra para exibir uma tela de erro seria pior que o problema.
 *
 * Exportamos o ARRAY `routes` separado do `router` para que os testes possam
 * montar a mesma tabela com `createMemoryRouter`. Sem isso, os testes teriam de
 * recriar as rotas à mão — e passariam a validar uma árvore que não é a que
 * roda em produção.
 */
export const routes: RouteObject[] = [
  {
    /**
     * Rota raiz sem `path`: não corresponde a nenhuma URL, serve para agrupar
     * tudo e concentrar três coisas que valem para a aplicação inteira.
     *
     * 1. `loader` — RESOLVE A SESSÃO ANTES DO PRIMEIRO RENDER.
     *    Depois de um F5 o token continua salvo, mas ainda não sabemos de quem
     *    ele é. Se as rotas renderizassem agora, o <RequireAuth> veria "sem
     *    usuário", mandaria para o login, e um instante depois a sessão seria
     *    restaurada — o clássico flash de tela de login a cada recarregamento.
     *    O router só renderiza as rotas depois que o loader termina, então
     *    esse estado intermediário nunca chega à tela.
     *
     *    Um loader é uma função comum, fora do React: por isso lê a store com
     *    `getState()`, sem hook.
     *
     * 2. `hydrateFallbackElement` — o que aparece ENQUANTO isso acontece (e
     *    enquanto o chunk `lazy` da primeira rota é baixado).
     *
     * 3. `errorElement` — declarado uma vez, vale para toda a árvore, já que os
     *    erros sobem até o ancestral mais próximo que saiba tratá-los.
     */
    loader: async () => {
      await useAuthStore.getState().restoreSession()
      return null
    },
    // Por padrão o router re-executa loaders em certas navegações (mudança de
    // query string, por exemplo). A sessão só precisa ser resolvida no boot.
    shouldRevalidate: () => false,
    hydrateFallbackElement: <FullPageLoading label="Carregando aplicação..." />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: ROUTES.login,
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth/pages/LoginPage')
          return { Component: LoginPage }
        },
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                // A raiz não tem tela própria: mandamos para a listagem.
                index: true,
                element: <Navigate to={ROUTES.products} replace />,
              },
              {
                path: ROUTES.products,
                lazy: async () => {
                  const { ProductListPage } =
                    await import('@/features/products/pages/ProductListPage')
                  return { Component: ProductListPage }
                },
              },
              {
                // A guarda é uma rota-mãe: quem não pode criar nunca chega ao
                // filho. A ordem em relação a ":id" não importa — o React
                // Router dá precedência a segmentos estáticos sobre dinâmicos,
                // então "new" jamais seria interpretado como um id.
                path: ROUTES.productNew,
                element: <RequirePermission permission="product:create" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { ProductCreatePage } =
                        await import('@/features/products/pages/ProductCreatePage')
                      return { Component: ProductCreatePage }
                    },
                  },
                ],
              },
              {
                // As mesmas funções que montam os links declaram o padrão da
                // rota: "/products/:id". O caminho existe em um lugar só.
                path: ROUTES.productDetail(':id'),
                lazy: async () => {
                  const { ProductDetailPage } =
                    await import('@/features/products/pages/ProductDetailPage')
                  return { Component: ProductDetailPage }
                },
              },
              {
                path: ROUTES.productEdit(':id'),
                element: <RequirePermission permission="product:update" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { ProductEditPage } =
                        await import('@/features/products/pages/ProductEditPage')
                      return { Component: ProductEditPage }
                    },
                  },
                ],
              },
              {
                path: ROUTES.forbidden,
                element: <ForbiddenPage />,
              },
            ],
          },
        ],
      },
      {
        // "*" casa com qualquer coisa que não bateu acima. Fica FORA do
        // RequireAuth de propósito: uma URL inexistente é 404 mesmo sem sessão.
        // Mandar para o login alguém que digitou o endereço errado seria confuso.
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
