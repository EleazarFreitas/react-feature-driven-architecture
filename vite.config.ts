import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Importamos `defineConfig` de "vitest/config" (e não de "vite") apenas para
// que a chave `test` abaixo seja tipada. O restante é config de Vite normal.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Exclui os arquivos de infraestrutura de teste da cobertura/execução.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
