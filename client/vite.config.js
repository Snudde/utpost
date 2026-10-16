export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/graphql': 'http://localhost:4000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})