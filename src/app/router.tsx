import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import { RequireAuth } from '@/app/guards/RequireAuth'
import { RequirePermission } from '@/app/guards/RequirePermission'
import { ROUTES } from '@/app/paths'
import { FullPageLoading } from '@/components/feedback/FullPageLoading'
import { AppLayout } from '@/components/layout/AppLayout'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

/**
 * Mapa de rotas da aplicação.
 *
 * A árvore é ANINHADA de propósito, e é isso que faz a proteção ser difícil de
 * esquecer:
 *
 *   (raiz sem path)            ← tratamento de erro e fallback de carregamento
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
 * separados, baixados só quando a rota é visitada. Divisão por rota é o único
 * tipo de divisão que quase sempre compensa — o limite é natural e coincide com
 * o que o usuário faz. Num app deste tamanho o ganho é modesto e honestamente
 * pequeno; o padrão está aqui porque é o que escala quando a aplicação cresce.
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
     * Rota raiz sem `path`: não corresponde a nenhuma URL, serve só para
     * agrupar. Existe por dois motivos concretos:
     *
     * 1. `hydrateFallbackElement` — na primeira carga, o router precisa baixar
     *    o chunk da rota antes de conseguir renderizá-la. Sem um fallback, não
     *    há nada para mostrar nesse intervalo (o React Router avisa no console:
     *    "No HydrateFallback element provided"). Aqui mostramos um carregando.
     *
     * 2. `errorElement` — declarado uma vez, vale para toda a árvore, já que os
     *    erros sobem até o ancestral mais próximo que saiba tratá-los.
     */
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
                path: 'products',
                lazy: async () => {
                  const { ProductListPage } =
                    await import('@/features/products/pages/ProductListPage')
                  return { Component: ProductListPage }
                },
              },
              {
                path: 'products/new',
                // A guarda é uma rota-mãe: quem não pode criar nunca chega ao
                // filho. Declarada ANTES de :id apenas por clareza de leitura —
                // o React Router já dá precedência a segmentos estáticos sobre
                // dinâmicos, então "new" jamais seria interpretado como um id.
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
                path: 'products/:id',
                lazy: async () => {
                  const { ProductDetailPage } =
                    await import('@/features/products/pages/ProductDetailPage')
                  return { Component: ProductDetailPage }
                },
              },
              {
                path: 'products/:id/edit',
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
                path: '403',
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
