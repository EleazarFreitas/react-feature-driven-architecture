import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Monta a regra que proíbe um grupo de imports, com uma mensagem que explica o
 * porquê. É o que transforma a "direção das dependências" (docs.md > Estrutura
 * de pastas) de combinado em regra: quem importar na direção errada vê o erro
 * no editor, e não numa revisão de código seis meses depois.
 */
const forbidImports = (group, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
})

export default defineConfig(
  globalIgnores(['dist', 'coverage']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Inclui as regras clássicas (rules-of-hooks, exhaustive-deps) e as do
      // React Compiler, que apontam mutação de props/estado, setState em efeito,
      // leitura de ref durante o render etc.
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      // Precisa ser o ÚLTIMO: desliga regras de estilo que conflitam com o Prettier.
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // `any` desliga o compilador. Erro, não warning — com escape consciente
      // via comentário eslint-disable quando houver justificativa real.
      '@typescript-eslint/no-explicit-any': 'error',
      // console.log esquecido vira ruído em produção; use o logger (src/lib/logger.ts).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // --- DIREÇÃO DAS DEPENDÊNCIAS:  app → features → código compartilhado -----

  {
    // Código compartilhado não conhece features nem a camada de composição.
    files: ['src/{components,config,hooks,lib}/**'],
    rules: forbidImports(
      ['@/features/*', '@/app/*', '@/pages/*'],
      'Código compartilhado (components, config, hooks, lib) não pode depender de features, pages ou app.',
    ),
  },
  {
    // Features não conhecem a camada de composição e não se importam entre si.
    // A exceção é `auth`: saber quem é o usuário e o que ele pode fazer é
    // transversal, então qualquer feature pode LER a sessão ("!" = exceto).
    files: ['src/features/**'],
    rules: forbidImports(
      ['@/app/*', '@/pages/*', '@/features/*', '!@/features/auth'],
      'Uma feature só pode importar de código compartilhado e de features/auth.',
    ),
  },
  {
    // O contrário não vale: auth não conhece nenhuma outra feature. (Dentro da
    // própria feature os imports são relativos, então nada aqui é bloqueado.)
    files: ['src/features/auth/**'],
    rules: forbidImports(
      ['@/app/*', '@/pages/*', '@/features/*'],
      'A feature auth só pode importar de código compartilhado.',
    ),
  },

  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      // Testes montam a aplicação inteira e podem importar de qualquer camada.
      'no-restricted-imports': 'off',
      // Testes podem logar livremente ao investigar uma falha.
      'no-console': 'off',
      // A regra do Fast Refresh protege o hot reload do app em desenvolvimento.
      // Arquivos de teste não são recarregados no navegador.
      'react-refresh/only-export-components': 'off',
    },
  },
)
