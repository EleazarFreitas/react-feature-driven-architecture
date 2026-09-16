import { z } from 'zod'

/**
 * Configuração de ambiente, validada UMA VEZ no boot da aplicação.
 *
 * Por que validar? Porque uma variável ausente ou com formato errado é um erro
 * de configuração, e erro de configuração deve explodir imediatamente com uma
 * mensagem clara — não virar um `undefined` que só causa um bug estranho três
 * telas depois ("fetch('undefined/products')").
 *
 * SEGURANÇA: o Vite substitui `import.meta.env.VITE_*` pelo valor literal em
 * tempo de build. Ou seja, essas variáveis ficam VISÍVEIS no bundle para
 * qualquer usuário. Elas são configuração pública, nunca segredo.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z
    .url('VITE_API_BASE_URL precisa ser uma URL válida (ex.: https://dummyjson.com)')
    // Normaliza: garante que não sobre "/" no final, senão montaríamos
    // URLs como "https://api.com//products".
    .transform((url) => url.replace(/\/+$/, '')),

  /**
   * API de UPLOAD — um serviço diferente do de produtos, de propósito.
   *
   * A DummyJSON não tem endpoint de upload (aceita só JSON com URLs de imagem),
   * então o arquivo vai para a Platzi Fake Store API, que devolve uma URL real.
   *
   * Isso não é um remendo: é o padrão que apps reais usam — a mídia vai para um
   * serviço dedicado (S3, Cloudinary) e a API de recursos guarda apenas a URL.
   */
  VITE_UPLOAD_API_BASE_URL: z
    .url('VITE_UPLOAD_API_BASE_URL precisa ser uma URL válida')
    .transform((url) => url.replace(/\/+$/, '')),

  // Vem do .env sempre como string; `coerce` converte para número.
  VITE_ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  // `stringbool` entende "true"/"false"/"1"/"0".
  VITE_ENABLE_DEBUG_LOGS: z.stringbool().default(false),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  // Falha rápida e barulhenta: melhor não subir do que subir quebrado.
  throw new Error(
    `Variáveis de ambiente inválidas:\n${details}\n\nCopie .env.example para .env e ajuste os valores.`,
  )
}

export const env = parsed.data

/** `true` durante `npm run dev` e nos testes. Útil para logs de debug. */
export const isDev = import.meta.env.DEV
