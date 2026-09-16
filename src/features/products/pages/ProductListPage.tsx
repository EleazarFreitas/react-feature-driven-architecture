import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { Pagination } from '@/components/ui/Pagination'
import { useHasPermission } from '@/features/auth/store/auth.store'

import { ProductCard } from '../components/ProductCard'
import { ProductFilters } from '../components/ProductFilters'
import { useProductCategories, useProducts } from '../hooks/useProducts'
import { useProductFilters } from '../hooks/useProductFilters'

/**
 * Listagem de produtos.
 *
 * Esta página é o exemplo completo dos QUATRO ESTADOS de uma tela que consome
 * API. `if (loading)` sozinho não é uma estratégia: ele só cobre o primeiro
 * momento e deixa o usuário sem resposta nos outros três.
 *
 *   1. CARREGANDO — "estamos buscando";
 *   2. ERRO       — "falhou, e aqui está o que fazer" (com nova tentativa);
 *   3. VAZIO      — "deu certo, mas não há nada" (o mais esquecido: sem ele o
 *                   usuário vê uma tela branca e acha que o app quebrou);
 *   4. SUCESSO    — os dados.
 *
 * Repare que o VAZIO tem dois textos diferentes: "nenhum produto cadastrado" e
 * "sua busca não encontrou nada" são situações distintas e pedem saídas
 * distintas. Tratar as duas como uma só é a diferença entre o usuário entender
 * ou não o que fazer em seguida.
 */
export function ProductListPage() {
  const filters = useProductFilters()
  const canCreate = useHasPermission('product:create')

  const productsQuery = useProducts(filters.query)
  const categoriesQuery = useProductCategories()

  const notice = useFlashNotice()

  const total = productsQuery.data?.total ?? 0
  // Estado DERIVADO: calculado na hora a partir de outros dados. Guardar isto
  // num useState criaria uma segunda fonte da verdade, capaz de divergir de
  // `total` — um clássico gerador de bug.
  const totalPages = Math.ceil(total / filters.query.pageSize)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
          <p className="text-sm text-slate-500">
            {productsQuery.isSuccess ? `${total} produto(s) encontrado(s)` : 'Catálogo de produtos'}
          </p>
        </div>

        {/* O botão só existe para quem pode criar. Isso é UX (não mostrar um
            caminho que terminaria em erro), não segurança — ver permissions.ts. */}
        {canCreate && <LinkButton to={ROUTES.productNew}>Novo produto</LinkButton>}
      </header>

      {notice && <Alert variant="success">{notice}</Alert>}

      <ProductFilters
        filters={filters}
        categories={categoriesQuery.data ?? []}
        isLoadingCategories={categoriesQuery.isLoading}
      />

      {/* ESTADO 1: carregando */}
      {productsQuery.isLoading && <LoadingState label="Carregando produtos..." />}

      {/* ESTADO 2: erro — com opção de tentar de novo */}
      {productsQuery.isError && (
        <ErrorState error={productsQuery.error} onRetry={productsQuery.refetch} />
      )}

      {/* ESTADO 3: vazio */}
      {productsQuery.isSuccess && productsQuery.data?.products.length === 0 && (
        <EmptyState
          title={
            filters.hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'
          }
          description={
            filters.hasActiveFilters
              ? 'Tente outro termo de busca ou remova os filtros aplicados.'
              : 'A API não retornou produtos para esta página.'
          }
          action={
            filters.hasActiveFilters ? (
              <Button variant="secondary" onClick={filters.clearFilters}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {/* ESTADO 4: sucesso */}
      {productsQuery.isSuccess && productsQuery.data && productsQuery.data.products.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productsQuery.data.products.map((product) => (
              // <ul>/<li> porque isto é, semanticamente, uma lista — um leitor
              // de tela anuncia "lista com 12 itens", o que orienta o usuário.
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>

          <Pagination
            page={filters.query.page}
            totalPages={totalPages}
            onPageChange={filters.setPage}
            // `isFetching` (e não `isLoading`): com `keepPreviousData` a lista
            // anterior continua na tela enquanto a próxima página carrega, e é
            // esse intervalo que precisa travar os botões de paginação.
            isDisabled={productsQuery.isFetching}
          />
        </>
      )}
    </div>
  )
}

/**
 * Lê a mensagem de sucesso deixada por outra página (criar/editar/excluir) e a
 * apaga em seguida.
 *
 * Por que apagar: `location.state` faz parte do histórico do navegador. Sem o
 * `replace`, a mensagem "Produto criado" reapareceria ao recarregar a página ou
 * ao voltar — parecendo que a ação aconteceu de novo.
 */
function useFlashNotice(): string | null {
  const location = useLocation()
  const navigate = useNavigate()

  const state: unknown = location.state
  const message =
    typeof state === 'object' &&
    state !== null &&
    'notice' in state &&
    typeof state.notice === 'string'
      ? state.notice
      : null

  // Guardamos numa variável de estado para que a mensagem continue visível
  // depois de limparmos o histórico.
  const [notice] = useState(message)

  useEffect(() => {
    if (message !== null) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
    // Roda uma vez: depois do replace, `message` já é null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return notice
}
