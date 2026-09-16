import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { ProductForm } from '../components/ProductForm'
import { useCreateProduct } from '../hooks/useProductMutations'
import { useProductCategories } from '../hooks/useProducts'
import type { ProductFormValues } from '../types/product.types'

/**
 * Criação de produto.
 *
 * A página orquestra; o <ProductForm> apresenta. O fluxo completo do formulário:
 *
 *   digita → valida (Zod, ao sair do campo) → envia → a mutação trava novo
 *   envio → service valida de novo e chama a API → sucesso: o cache das
 *   listagens é invalidado e navegamos com a mensagem / erro: o formulário
 *   mostra o Alert e os dados digitados permanecem na tela.
 *
 * Esse último ponto importa: em caso de erro NÃO limpamos o formulário. Perder
 * o que foi digitado por causa de uma falha de rede é das piores experiências
 * possíveis.
 */
export function ProductCreatePage() {
  const navigate = useNavigate()
  const categoriesQuery = useProductCategories()

  // A invalidação do cache da listagem está DENTRO do hook (ver
  // hooks/useProductMutations.ts). A página só cuida da navegação.
  const createMutation = useCreateProduct()

  const handleSubmit = (values: ProductFormValues) => {
    // Trava contra envio duplo pelo Enter — o botão já fica desabilitado por
    // `isPending`, mas o submit do formulário não passa pelo botão.
    if (createMutation.isPending) return

    createMutation.mutate(values, {
      // Em caso de erro não fazemos nada aqui: ele já está em
      // `createMutation.error` e o formulário o exibe, com os dados preservados.
      onSuccess: (created) => {
        navigate(ROUTES.products, {
          state: {
            // Somos honestos sobre a limitação: a API responde 201 com um id
            // novo, mas não grava nada. Dizer apenas "Produto criado!" faria o
            // usuário procurar na lista um item que nunca vai aparecer.
            notice: `Produto enviado com sucesso (id ${created.id}). A API DummyJSON simula a escrita: o item não será gravado no catálogo.`,
          },
        })
      },
    })
  }

  // O formulário depende das categorias para montar o <select>, então tratamos
  // os estados dessa busca antes de renderizá-lo.
  if (categoriesQuery.isLoading) return <LoadingState label="Carregando categorias..." />

  if (categoriesQuery.isError) {
    return <ErrorState error={categoriesQuery.error} onRetry={categoriesQuery.refetch} />
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Novo produto</h1>
        <p className="text-sm text-slate-500">Preencha os dados do produto.</p>
      </header>

      <Alert variant="info" title="Ambiente de demonstração">
        A API pública utilizada aceita a requisição e devolve um id, mas não persiste os dados. Nada
        será alterado no catálogo real.
      </Alert>

      <ProductForm
        categories={categoriesQuery.data ?? []}
        onSubmit={handleSubmit}
        onCancel={() => navigate(ROUTES.products)}
        isSubmitting={createMutation.isPending}
        submitError={createMutation.error}
        submitLabel="Criar produto"
      />
    </div>
  )
}
