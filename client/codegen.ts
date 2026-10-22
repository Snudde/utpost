import type { CodegenConfig } from '@graphql-codegen/cli'

// M5: den typade kedjan. Codegen läser schemat ur API:et (samma fil som servern kör) och varje
// fråga i src/ (det som står i graphql(`…`)), och skriver typerna till src/gql/.
// Ändras schemat ändras typerna – och vue-tsc säger ifrån i varje vy som inte längre stämmer.
// Kör: npm run codegen (körs också av npm run typecheck, alltså i pipelinen).
const config: CodegenConfig = {
  schema: '../api/src/graphql/schema.js',
  documents: ['src/**/*.vue', 'src/**/*.ts', '!src/gql/**'],
  generates: {
    './src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      // type-only-importer: paketet med TypedDocumentNode har bara typer, och Vite får inte försöka ladda det
      config: { useTypeImports: true },
    },
  },
}

export default config