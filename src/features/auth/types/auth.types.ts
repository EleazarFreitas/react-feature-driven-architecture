/**
 * Papéis existentes na API DummyJSON (confirmados consultando /users).
 *
 * Union de strings em vez de `enum`: o resultado é o mesmo para o que
 * precisamos, sem gerar código em runtime — e o projeto usa
 * `erasableSyntaxOnly`, que proíbe `enum` justamente por isso.
 */
export type Role = 'admin' | 'moderator' | 'user'

/**
 * O usuário como a APLICAÇÃO o enxerga.
 *
 * /auth/me devolve ~25 campos (inclusive `password` e dados bancários falsos).
 * Modelamos só o que a UI usa: o tipo vira documentação do que realmente
 * importa, e nada de sensível circula sem necessidade pelo app.
 */
export interface AuthUser {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  image: string
  role: Role
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  username: string
  password: string
}

/**
 * Estado da sessão como MÁQUINA DE ESTADOS, não como booleanos soltos.
 *
 * Por que isso importa: com `isLoading` + `isAuthenticated` separados existem
 * quatro combinações, e duas não fazem sentido. Pior, o estado inicial
 * (isLoading=true, isAuthenticated=false) é indistinguível de "deslogado" —
 * e é exatamente aí que nasce o bug clássico de a rota protegida chutar o
 * usuário para o login durante um F5. Com um union de três valores, esse
 * estado é impossível de representar.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
