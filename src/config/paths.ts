/**
 * Todas as URLs da aplicação em um só lugar.
 *
 * Por que não escrever "/products" direto no componente? Porque strings soltas
 * espalhadas pelo código não são checadas por nada: um erro de digitação em
 * <Link to="/prodcuts"> só aparece quando alguém clica. Aqui, o TypeScript
 * cobra o nome — e renomear uma rota vira uma alteração de um arquivo só.
 *
 * As funções (em vez de template string no local de uso) concentram a montagem
 * do caminho. A tabela de rotas usa as MESMAS funções para declarar o padrão:
 * `ROUTES.productDetail(':id')` vira "/products/:id" (ver app/router.tsx).
 *
 * Mora em `config/` e NÃO importa nada. Isso é proposital: sendo uma folha na
 * árvore de dependências, qualquer camada (app, features, components) pode
 * importá-lo sem inverter a direção das setas nem criar ciclo.
 */
export const ROUTES = {
  login: '/login',
  products: '/products',
  productNew: '/products/new',
  productDetail: (id: number | string) => `/products/${id}`,
  productEdit: (id: number | string) => `/products/${id}/edit`,
  forbidden: '/403',
} as const
