/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    pool: 'threads',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'src/test/**',
        'src/**/*.test.*',
        'src/vite-env.d.ts',
        // ReactFlow-dependent components (covered by Playwright E2E suites)
        'src/components/Canvas/**',
        'src/components/Edges/**',
        'src/components/Nodes/**',
        'src/components/Pins/**',
        'src/components/Search/**',
        'src/components/Toolbar/**',
        'src/components/ExportPreview/**',
        'src/components/Palette/**',
      ],
    },
  },
})
