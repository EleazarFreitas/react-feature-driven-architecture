import { zodResolver } from '@hookform/resolvers/zod'
import { useController, useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { getErrorMessage } from '@/lib/http/errors'

import { useImageUpload } from '../hooks/useImageUpload'
import { productFormSchema } from '../schemas/product.schema'
import type { ProductFormValues } from '../types/product.types'
import { ProductImageField } from './ProductImageField'

/**
 * Formulário de produto, usado por CRIAR e EDITAR.
 *
 * Um componente para os dois casos porque os campos e as regras são idênticos —
 * a única diferença é de onde vêm os valores iniciais e para onde o resultado
 * é enviado. Duplicar em ProductCreateForm/ProductEditForm significaria corrigir
 * cada bug duas vezes.
 *
 * DIVISÃO DE RESPONSABILIDADES (o ponto importante deste arquivo):
 *   - o FORMULÁRIO cuida dos campos, da validação e do que mostrar ao usuário;
 *   - a PÁGINA cuida da chamada à API e da navegação depois do sucesso.
 * Por isso ele recebe `onSubmit`, `isSubmitting` e `submitError` de fora, em vez
 * de chamar o service sozinho.
 */

interface ProductFormProps {
  /** Valores iniciais. Ausentes no modo de criação. */
  defaultValues?: ProductFormValues
  categories: string[]
  onSubmit: (values: ProductFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
  /** Erro vindo da API, ou null (a validação de campo é tratada internamente). */
  submitError: unknown
  submitLabel: string
}

const EMPTY_FORM: ProductFormValues = {
  title: '',
  description: '',
  category: '',
  // NaN e não 0: com 0 o campo apareceria preenchido com "0" e o usuário teria
  // de apagar antes de digitar. NaN renderiza como campo vazio e reprova na
  // validação com a mensagem correta, que é o comportamento desejado.
  price: Number.NaN,
  stock: Number.NaN,
  discountPercentage: 0,
}

export function ProductForm({
  defaultValues = EMPTY_FORM,
  categories,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  submitLabel,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    // Liga o Zod ao React Hook Form: o esquema passa a ser a regra do formulário.
    resolver: zodResolver(productFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  /**
   * POR QUE `useController` AQUI, SE OS OUTROS CAMPOS USAM `register`?
   *
   * `register` serve para inputs NATIVOS: ele liga a `ref` ao elemento e lê o
   * valor direto do DOM. Funciona para <input>, <select> e <textarea>.
   *
   * A imagem não tem um input nativo cujo valor represente o dado: o valor é
   * uma URL produzida pelo upload, que não está digitada em lugar nenhum.
   * `useController` existe exatamente para esse caso — ele devolve um par
   * `value`/`onChange` controlado pelo formulário para um componente qualquer.
   * É a mesma ferramenta que você usaria com um date picker ou um select de
   * biblioteca.
   */
  const { field: thumbnail } = useController({ control, name: 'thumbnail' })

  /**
   * O upload roda em paralelo ao preenchimento do formulário, então é possível
   * clicar em "Salvar" com a imagem ainda subindo. Se isso acontecesse, o
   * produto seria criado sem a `thumbnail` — e o usuário juraria que anexou a
   * imagem. Por isso o botão de salvar olha para `imageUpload.isUploading`.
   */
  const imageUpload = useImageUpload(thumbnail.onChange)

  function handleReset() {
    // A ordem importa: `clear()` zera o campo de imagem, e o `reset()` em
    // seguida devolve TODOS os campos (inclusive a imagem) ao valor inicial.
    imageUpload.clear()
    reset()
  }

  return (
    <form
      // `handleSubmit` só chama nosso callback se a validação passar, e já faz
      // o preventDefault. Por isso o submit nativo do <form> continua
      // funcionando (Enter em qualquer campo envia), o que é bom para
      // acessibilidade e para quem usa teclado.
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {submitError !== null && (
        <Alert variant="error" title="Não foi possível salvar">
          {getErrorMessage(submitError)}
        </Alert>
      )}

      <Input label="Título" error={errors.title?.message} {...register('title')} />

      <Textarea
        label="Descrição"
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />

      <Select label="Categoria" error={errors.category?.message} {...register('category')}>
        <option value="">Selecione...</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input
          label="Preço (USD)"
          type="number"
          step="0.01"
          min="0"
          error={errors.price?.message}
          // `valueAsNumber` faz o RHF entregar número em vez de string — sem
          // isso, o Zod receberia "19.9" e reclamaria do tipo.
          {...register('price', { valueAsNumber: true })}
        />

        <Input
          label="Estoque"
          type="number"
          min="0"
          step="1"
          error={errors.stock?.message}
          {...register('stock', { valueAsNumber: true })}
        />

        <Input
          label="Desconto (%)"
          type="number"
          min="0"
          max="100"
          step="0.1"
          error={errors.discountPercentage?.message}
          {...register('discountPercentage', { valueAsNumber: true })}
        />
      </div>

      <ProductImageField
        upload={imageUpload}
        currentUrl={thumbnail.value}
        disabled={isSubmitting}
      />

      {imageUpload.isUploading && (
        <p role="status" className="text-sm text-slate-500">
          Aguarde o envio da imagem terminar para salvar.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {/* `isLoading` desabilita o botão: é a trava contra clique duplo. O envio
            por Enter (que não passa pelo botão) é barrado na página, que ignora
            o submit enquanto a mutação está pendente. */}
        <Button type="submit" isLoading={isSubmitting} disabled={imageUpload.isUploading}>
          {submitLabel}
        </Button>

        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>

        {/* Só aparece quando há o que desfazer — `isDirty` é o RHF comparando os
            valores atuais com os iniciais. */}
        {isDirty && (
          <Button variant="ghost" onClick={handleReset} disabled={isSubmitting} className="ml-auto">
            Desfazer alterações
          </Button>
        )}
      </div>
    </form>
  )
}
