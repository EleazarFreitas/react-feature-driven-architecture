import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { Pagination } from '@/components/ui/Pagination'
import { ROUTES } from '@/config/paths'
import { useHasPermission } from '@/features/auth/store/auth.store'
import { useFlashNotice } from '@/hooks/useFlashNotice'

import { ProductCard } from '../components/ProductCard'
import { ProductFilters } from '../components/ProductFilters'
import { useProductFilters } from '../hooks/useProductFilters'
import { useProductCategories, useProducts } from '../hooks/useProducts'

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
 * Repare que o VAZIO tem dois textos diferentes: "nenhum produto disponível" e
 * "sua busca não encontrou nada" são situações distintas e pedem saídas
 * distintas. Tratar as duas como uma só é a diferença entre o usuário entender
 * ou não o que fazer em seguida.
 */
export function ProductListPage() {
  const filters = useProductFilters()
  const canCreate = useHasPermission('product:create')

  const productsQuery = useProducts(filters.query)
  const categoriesQuery = useProductCategories()

  // Aviso deixado pela tela anterior ("Produto enviado...", "Exclusão enviada...").
  const notice = useFlashNotice()

  const products = productsQuery.data?.products ?? []
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

      {/* ESTADO 1: carregando. `isLoading` é a PRIMEIRA busca, sem nada em
          cache para mostrar — numa revalidação em segundo plano ele é false. */}
      {productsQuery.isLoading && <LoadingState label="Carregando produtos..." />}

      {/* ESTADO 2: erro — com opção de tentar de novo */}
      {productsQuery.isError && (
        <ErrorState error={productsQuery.error} onRetry={productsQuery.refetch} />
      )}

      {/* ESTADO 3: vazio */}
      {productsQuery.isSuccess && products.length === 0 && (
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
            filters.hasActiveFilters && (
              <Button variant="secondary" onClick={filters.clearFilters}>
                Limpar filtros
              </Button>
            )
          }
        />
      )}

      {/* ESTADO 4: sucesso */}
      {productsQuery.isSuccess && products.length > 0 && (
        <>
          <ul
            className={[
              'grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              // Com `keepPreviousData`, ao trocar de página ou de filtro a
              // lista ANTERIOR continua na tela até a nova chegar.
              // `isPlaceholderData` é o sinal disso: esmaecemos a lista para o
              // usuário perceber que aquilo ainda não é o resultado pedido.
              productsQuery.isPlaceholderData ? 'opacity-50' : '',
            ].join(' ')}
          >
            {products.map((product) => (
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
            // Trava os botões enquanto a página pedida carrega: nesse intervalo
            // o total de páginas ainda é o da consulta anterior.
            isDisabled={productsQuery.isPlaceholderData}
          />
        </>
      )}
    </div>
  )
}
