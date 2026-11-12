import { globalIgnores } from 'eslint/config'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from 'eslint-config-prettier/flat'

// defineConfigWithVueTs ger ESLint TypeScript-parsern, även i <script setup lang="ts"> i .vue-filer.
// Utan den läses lang="ts" som vanlig JavaScript: `import type { … }` blir ett parsningsfel och
// `ref<string>()` ger "'string' is not defined".
// Komponenter utan lang="ts" (App, AppHeader, GuideCard …) är fortfarande tillåtna – de byts i egen takt.
configureVueProject({ scriptLangs: ['ts', 'js'] })

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx,ts,mts,tsx}'],
  },

  // src/gql/ skrivs av codegen – den lintar vi inte, vi genererar om den.
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'src/gql/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/*.test.{js,ts}'],
  },

  skipFormatting,
)
