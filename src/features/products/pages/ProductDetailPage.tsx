import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LinkButton } from '@/components/ui/LinkButton'
import { useHasPermission } from '@/features/auth/store/auth.store'
import { formatCurrency, formatPercent } from '@/lib/format'
import { getErrorMessage } from '@/lib/http/errors'

import { useDeleteProduct } from '../hooks/useProductMutations'
import { useProduct } from '../hooks/useProducts'

/**
 * Detalhe do produto, com as ações de editar e excluir.
 *
 * PARÂMETRO DE ROTA: a rota é `/products/:id`, e `useParams()` devolve esse
 * `:id` SEMPRE como string (ou undefined) — o React Router não sabe que ali
 * deveria haver um número. Converter e validar é responsabilidade nossa: a URL
 * é entrada do usuário, e `/products/abc` é perfeitamente possível de digitar.
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canUpdate = useHasPermission('product:update')
  const canDelete = useHasPermission('product:delete')

  // `Number(undefined)` e `Number('abc')` dão NaN; o hook não dispara a
  // requisição nesse caso (ver `enabled` em useProduct).
  const productId = Number(id)
  const productQuery = useProduct(productId)

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Invalida as listagens no sucesso (ver hooks/useProductMutations.ts).
  const deleteMutation = useDeleteProduct(productId)

  const handleDelete = () => {
    if (deleteMutation.isPending) return

    deleteMutation.mutate(undefined, {
      // Sem `onError`: quando falha, mantemos o usuário aqui e o diálogo aberto,
      // e o erro aparece no Alert abaixo a partir de `deleteMutation.error`.
      onSuccess: () => {
        setIsConfirmingDelete(false)
        navigate(ROUTES.products, {
          replace: true,
          state: {
            notice:
              'Exclusão enviada com sucesso. A API DummyJSON simula a operação: o produto continuará na lista.',
          },
        })
      },
    })
  }

  if (!Number.isInteger(productId)) {
    return <ErrorState error={new Error('O endereço informado não contém um id válido.')} />
  }

  if (productQuery.isLoading) return <LoadingState label="Carregando produto..." />

  if (productQuery.isError) {
    return <ErrorState error={productQuery.error} onRetry={productQuery.refetch} />
  }

  const product = productQuery.data
  // Guarda para o TypeScript: `data` é `Product | undefined` enquanto a busca
  // não terminou. Depois deste if o compilador sabe que `product` existe, sem
  // precisar de `!` ou `?.`.
  if (!product) return null

  return (
    <article className="flex flex-col gap-6">
      <nav>
        <LinkButton to={ROUTES.products} variant="ghost" className="-ml-4">
          ← Voltar para a lista
        </LinkButton>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="w-full rounded-lg border border-slate-200 bg-white object-contain p-6"
        />

        <div className="flex flex-col gap-4">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{product.category}</Badge>
              {product.brand !== undefined && <Badge>{product.brand}</Badge>}
              <Badge tone={product.stock > 0 ? 'success' : 'danger'}>
                {product.availabilityStatus}
              </Badge>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">{product.title}</h1>
          </header>

          <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <div>
              <dt className="text-slate-500">Preço</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatCurrency(product.price)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Desconto</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatPercent(product.discountPercentage)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Estoque</dt>
              <dd className="font-medium text-slate-900">{product.stock} unidade(s)</dd>
            </div>
            <div>
              <dt className="text-slate-500">Avaliação</dt>
              <dd className="font-medium text-slate-900">{product.rating.toFixed(2)} / 5</dd>
            </div>
          </dl>

          {/* Se a exclusão falhar, o usuário precisa saber. Sem isto o clique em
              "Excluir" pareceria não ter feito nada. */}
          {deleteMutation.error !== null && (
            <Alert variant="error" title="Não foi possível excluir">
              {getErrorMessage(deleteMutation.error)}
            </Alert>
          )}

          {/* Cada ação aparece conforme a permissão do papel: o moderador edita
              mas não exclui; o papel "user" não vê nenhuma das duas. */}
          <div className="flex flex-wrap gap-3">
            {canUpdate && <LinkButton to={ROUTES.productEdit(product.id)}>Editar</LinkButton>}

            {canDelete && (
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Excluir
              </Button>
            )}
          </div>
        </div>
      </div>

      {/*
        Exclusão é destrutiva e irreversível: pedir confirmação é o mínimo.
        O estado do diálogo é local porque só esta tela precisa dele — jogá-lo
        num contexto global só aumentaria o acoplamento sem benefício.
      */}
      <ConfirmDialog
        open={isConfirmingDelete}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${product.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </article>
  )
}
