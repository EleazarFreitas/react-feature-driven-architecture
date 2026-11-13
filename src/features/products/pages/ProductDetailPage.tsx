import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LinkButton } from '@/components/ui/LinkButton'
import { ROUTES } from '@/config/paths'
import { useHasPermission } from '@/features/auth/store/auth.store'
import { useFlashNotice } from '@/hooks/useFlashNotice'
import { formatCurrency, formatPercent } from '@/lib/format'
import { AppError, getErrorMessage } from '@/lib/http/errors'

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
  const { id } = useParams()
  const navigate = useNavigate()
  const canUpdate = useHasPermission('product:update')
  const canDelete = useHasPermission('product:delete')

  // `Number(undefined)` e `Number('abc')` dão NaN; o hook não dispara a
  // requisição nesse caso (ver `enabled` em useProduct).
  const productId = Number(id)
  const productQuery = useProduct(productId)

  // Aviso deixado pela tela de edição ("Alterações enviadas...").
  const notice = useFlashNotice()

  // Estado LOCAL: só esta tela precisa saber se o diálogo está aberto.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const deleteMutation = useDeleteProduct(productId)

  const handleDelete = () => {
    if (deleteMutation.isPending) return

    deleteMutation.mutate(undefined, {
      // Sem `onError`: quando falha, mantemos o usuário aqui e o erro aparece
      // no Alert abaixo, a partir de `deleteMutation.error`.
      onSuccess: () => {
        navigate(ROUTES.products, {
          // `replace`: "voltar" não deve cair no detalhe de algo recém-excluído.
          replace: true,
          state: {
            notice:
              'Exclusão enviada com sucesso. A API DummyJSON simula a operação: o produto continuará na lista.',
          },
        })
      },
      // Com sucesso ou com erro, o diálogo fecha — o resultado aparece na tela.
      onSettled: () => setIsConfirmingDelete(false),
    })
  }

  if (!Number.isInteger(productId)) {
    return <ErrorState error={new AppError('O endereço informado não contém um id válido.')} />
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
      <div>
        <LinkButton to={ROUTES.products} variant="ghost" className="-ml-4">
          ← Voltar para a lista
        </LinkButton>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}

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

          {/* <dl> é a tag para pares "termo: valor" — um leitor de tela anuncia
              cada valor junto do rótulo a que pertence. */}
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
          {deleteMutation.isError && (
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

      {/* Exclusão é destrutiva e irreversível: pedir confirmação é o mínimo. */}
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
