import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// `defineConfig` vem de "vitest/config" (e não de "vite") apenas para que a
// chave `test` abaixo seja tipada. O restante é config de Vite normal.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Lê o alias "@/..." direto de `paths` no tsconfig — sem repeti-lo aqui.
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // A ordem importa: os polyfills precisam existir antes de o setup importar
    // qualquer módulo da aplicação (ver src/test/polyfills.ts).
    setupFiles: ['./src/test/polyfills.ts', './src/test/setup.ts'],
  },
})
