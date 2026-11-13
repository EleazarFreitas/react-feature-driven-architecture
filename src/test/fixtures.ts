import type { AuthTokens, AuthUser, Role } from '@/features/auth/types/auth.types'
import type { Product } from '@/features/products/types/product.types'

/**
 * Dados de teste.
 *
 * As "factories" recebem um objeto de sobrescrita para que cada teste declare
 * APENAS o que importa para ele:
 *
 *   makeProduct({ stock: 0 })   // "um produto qualquer, mas sem estoque"
 *
 * Isso mantém o teste legível — quem lê entende na hora qual é a condição em
 * jogo — e evita que a adição de um campo novo quebre vinte testes de uma vez.
 */

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    title: 'Notebook Pro 14',
    description: 'Notebook para desenvolvimento com 16GB de memória.',
    category: 'laptops',
    price: 1299.99,
    discountPercentage: 10,
    rating: 4.5,
    stock: 25,
    brand: 'Acme',
    thumbnail: 'https://cdn.test/notebook.png',
    images: ['https://cdn.test/notebook.png'],
    tags: ['laptop'],
    availabilityStatus: 'In Stock',
    ...overrides,
  }
}

export function makeUser(role: Role = 'admin', overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    username: 'emilys',
    email: 'emily@test.com',
    firstName: 'Emily',
    lastName: 'Johnson',
    image: 'https://cdn.test/emily.png',
    role,
    ...overrides,
  }
}

/**
 * Par de tokens de mentira. O frontend trata o token como um texto OPACO: só o
 * guarda e o devolve no header Authorization. Quem entende o conteúdo (e
 * confere a assinatura) é o backend — por isso aqui não precisa ser um JWT.
 */
export const TEST_TOKENS: AuthTokens = {
  accessToken: 'access-token-de-teste',
  refreshToken: 'refresh-token-de-teste',
}
