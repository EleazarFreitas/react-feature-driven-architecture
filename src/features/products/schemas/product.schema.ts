import { z } from 'zod'

/**
 * Esquemas Zod da feature de produtos.
 *
 * Aqui ficam os VALIDADORES (código que roda). Os tipos estáticos usados pela
 * aplicação são inferidos deles em `types/product.types.ts`. Assim existe uma
 * só fonte da verdade: mudou o esquema, o tipo muda junto e o compilador aponta
 * todos os lugares afetados.
 *
 * Há dois grupos, com propósitos diferentes:
 *   - esquemas de RESPOSTA: validam o que chega da API;
 *   - esquema de FORMULÁRIO: valida o que o usuário digita.
 */

/**
 * Um produto como a DummyJSON devolve.
 *
 * Modelamos apenas os campos que a interface usa — a resposta real traz ~20
 * campos (reviews, dimensões, política de devolução...). Um tipo menor é
 * documentação melhor: deixa claro do que a tela realmente depende.
 *
 * `brand` é opcional porque de fato falta em boa parte do catálogo (verificado:
 * 92 dos 194 produtos não têm marca). Marcar como obrigatório passaria no
 * TypeScript e quebraria na tela.
 */
export const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number(),
  brand: z.string().optional(),
  thumbnail: z.string(),
  images: z.array(z.string()),
  tags: z.array(z.string()),
  availabilityStatus: z.string(),
})

/**
 * Envelope de listagem. A DummyJSON usa o mesmo formato em /products,
 * /products/search e /products/category/:slug — por isso um esquema só.
 *
 * `total` é o total de itens no SERVIDOR (não o tamanho desta página): é ele
 * que permite calcular a quantidade de páginas.
 */
export const productListResponseSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
})

/**
 * Resposta de POST /products/add e PUT /products/:id.
 *
 * ATENÇÃO — comportamento real da API, verificado: a resposta NÃO é um produto
 * completo. O POST ecoa os campos enviados mais um `id`; o PUT devolve o
 * produto pela metade (sem `tags`, `availabilityStatus` e outros). Por isso não
 * validamos com `productSchema` (falharia por campos ausentes): exigimos só o
 * `id`, que é a única coisa que a aplicação usa dessa resposta.
 */
export const productWriteResponseSchema = z.object({
  id: z.number(),
})

/** GET /products/category-list devolve uma lista simples de slugs. */
export const categoryListSchema = z.array(z.string())

/**
 * Validação do FORMULÁRIO de produto (criar e editar usam o mesmo).
 *
 * As mensagens são escritas para o usuário final: dizem o que fazer, não qual
 * regra falhou ("Informe um preço maior que zero", e não "price: positive").
 *
 * Os campos numéricos são registrados no formulário com `valueAsNumber`, então
 * chegam aqui já como número. Quando o campo está vazio o valor é NaN, que o
 * `z.number()` recusa — e o `error` troca a mensagem técnica do Zod
 * ("expected number, received NaN") por uma legível.
 */
export const productFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'O título precisa ter ao menos 3 caracteres')
    .max(120, 'O título pode ter no máximo 120 caracteres'),

  description: z
    .string()
    .trim()
    .min(10, 'A descrição precisa ter ao menos 10 caracteres')
    .max(1000, 'A descrição pode ter no máximo 1000 caracteres'),

  category: z.string().min(1, 'Selecione uma categoria'),

  price: z
    .number({ error: 'Informe um preço válido' })
    .positive('O preço precisa ser maior que zero')
    .max(1_000_000, 'O preço parece alto demais'),

  stock: z
    .number({ error: 'Informe um estoque válido' })
    .int('O estoque precisa ser um número inteiro')
    .min(0, 'O estoque não pode ser negativo'),

  discountPercentage: z
    .number({ error: 'Informe um desconto válido' })
    .min(0, 'O desconto não pode ser negativo')
    .max(100, 'O desconto não pode passar de 100%'),

  /**
   * URL da imagem, JÁ ENVIADA ao serviço de upload.
   *
   * Repare que o formulário guarda a URL (string), e não o `File`. O upload
   * acontece assim que o usuário escolhe o arquivo, não no submit — é a UX mais
   * comum e evita que ele espere o envio depois de clicar em "Salvar".
   *
   * Opcional porque produto sem imagem é aceitável.
   */
  thumbnail: z.url('A imagem enviada retornou uma URL inválida').optional(),
})

/**
 * Validação do ARQUIVO escolhido, antes de enviá-lo.
 *
 * É um esquema separado do formulário porque valida algo de natureza diferente:
 * o formulário valida a URL resultante; isto valida o `File` que o usuário
 * acabou de escolher, para barrar o envio inútil de algo que será recusado.
 *
 * ⚠️ ISTO É UX, NÃO SEGURANÇA. Tanto a extensão quanto o `type` (MIME) vêm do
 * cliente e são forjáveis: basta renomear `virus.exe` para `foto.png`. Um
 * servidor real precisa revalidar inspecionando os *magic bytes* do conteúdo,
 * limitar o tamanho na borda e servir o arquivo de outro domínio. Vale a regra
 * de sempre: o frontend não é fronteira de segurança.
 */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * SVG está FORA da lista de propósito. SVG é XML e pode conter <script>: servido
 * na mesma origem, vira XSS. Aceitar só formatos raster elimina essa classe de
 * problema (ver docs.md > Segurança).
 */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const imageFileSchema = z
  .instanceof(File, { error: 'Selecione um arquivo de imagem' })
  .refine((file) => file.size > 0, { error: 'O arquivo está vazio' })
  .refine((file) => file.size <= MAX_IMAGE_BYTES, {
    error: 'A imagem precisa ter no máximo 2 MB',
  })
  .refine((file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type), {
    error: 'Formato não aceito. Use PNG, JPG ou WebP',
  })
