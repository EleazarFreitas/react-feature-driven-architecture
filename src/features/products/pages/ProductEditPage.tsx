import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Alert } from '@/components/ui/Alert'
import { ROUTES } from '@/config/paths'
import { AppError } from '@/lib/http/errors'

import { ProductForm } from '../components/ProductForm'
import { useUpdateProduct } from '../hooks/useProductMutations'
import { useProduct, useProductCategories } from '../hooks/useProducts'
import type { Product, ProductFormValues } from '../types/product.types'

/**
 * Edição de produto.
 *
 * Diferença estrutural em relação à criação: aqui precisamos CARREGAR os dados
 * antes de montar o formulário. Por isso o <ProductForm> só é renderizado
 * depois que o produto chega — assim ele nasce com os `defaultValues` corretos.
 *
 * A alternativa seria montar o formulário vazio e chamar `reset(dados)` quando
 * a requisição terminasse. Funciona, mas abre espaço para um bug real: se o
 * usuário começar a digitar antes da resposta, o reset apaga o que ele escreveu.
 * Esperar os dados é mais simples e não tem esse problema.
 */
export function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const productId = Number(id)
  const productQuery = useProduct(productId)
  const categoriesQuery = useProductCategories()

  // O hook invalida o detalhe e as listagens e ESPERA a revalidação — por isso
  // a tela de detalhe, para onde navegamos em seguida, já abre com o dado novo.
  const updateMutation = useUpdateProduct(productId)

  const handleSubmit = (values: ProductFormValues) => {
    if (updateMutation.isPending) return

    updateMutation.mutate(values, {
      onSuccess: () => {
        navigate(ROUTES.productDetail(productId), {
          state: {
            notice: 'Alterações enviadas. A API DummyJSON simula a escrita e não grava os dados.',
          },
        })
      },
    })
  }

  if (!Number.isInteger(productId)) {
    return <ErrorState error={new AppError('O endereço informado não contém um id válido.')} />
  }

  // Duas requisições independentes (produto e categorias) precisam ter chegado.
  if (productQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingState label="Carregando produto..." />
  }

  if (productQuery.isError) {
    return <ErrorState error={productQuery.error} onRetry={productQuery.refetch} />
  }

  if (categoriesQuery.isError) {
    return <ErrorState error={categoriesQuery.error} onRetry={categoriesQuery.refetch} />
  }

  const product = productQuery.data
  if (!product) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Editar produto</h1>
        <p className="text-sm text-slate-500">{product.title}</p>
      </header>

      <Alert variant="info" title="Ambiente de demonstração">
        A API pública utilizada responde com sucesso, mas não persiste as alterações. Ao recarregar,
        os dados originais continuarão lá.
      </Alert>

      <ProductForm
        defaultValues={toFormValues(product)}
        categories={categoriesQuery.data ?? []}
        onSubmit={handleSubmit}
        onCancel={() => navigate(ROUTES.productDetail(productId))}
        isSubmitting={updateMutation.isPending}
        submitError={updateMutation.error}
        submitLabel="Salvar alterações"
      />
    </div>
  )
}

/**
 * Converte o produto da API para os campos do formulário.
 *
 * Os dois tipos são parecidos, mas NÃO são o mesmo: o produto tem id, rating,
 * imagens e outros campos que o formulário não edita. Fazer a conversão
 * explicitamente evita mandar de volta para a API um monte de campo que o
 * usuário nunca tocou.
 */
function toFormValues(product: Product): ProductFormValues {
  return {
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price,
    stock: product.stock,
    discountPercentage: product.discountPercentage,
    // A imagem já existente entra como URL. Enquanto o usuário não escolher um
    // arquivo novo, é ela que continua valendo — editar o preço não deveria
    // exigir reenviar a foto.
    thumbnail: product.thumbnail,
  }
}
