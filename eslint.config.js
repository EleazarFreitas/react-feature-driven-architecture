import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

// Flat config (padrão do ESLint 9+).
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      // Precisa ser o ÚLTIMO: desliga regras de estilo que conflitam com o Prettier.
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // `any` desliga o compilador. Erro, não warning — com escape consciente
      // via comentário eslint-disable quando houver justificativa real.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // console.log esquecido vira ruído em produção; use o logger (src/lib/logger.ts).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      // Testes podem logar livremente ao investigar uma falha.
      'no-console': 'off',
      // A regra do Fast Refresh protege o hot reload do app em desenvolvimento.
      // Arquivos de teste não são recarregados no navegador, então exigir que
      // um helper exporte só componentes seria burocracia sem benefício.
      'react-refresh/only-export-components': 'off',
    },
  },
)
