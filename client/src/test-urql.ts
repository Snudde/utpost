import { vi } from 'vitest'
import type { Plugin } from 'vue'
import urql, { createClient, fetchExchange } from '@urql/vue'
import type { Client } from '@urql/vue'

// Komponenter med useQuery behöver en urql-klient. Varje render får en egen, utan cacheExchange,
// så att ett svar från ett test aldrig följer med till nästa.
export const urqlPlugin = (): [Plugin, Client] => [
  urql,
  // preferGetMethod: false som i urql.ts – annars skickar urql korta frågor som GET
  createClient({ url: '/graphql', exchanges: [fetchExchange], preferGetMethod: false }),
]

// Vi mockar fetch och låter urql göra resten, som i appen. urql läser Content-Type,
// så svaret måste vara ett riktigt Response – ett { ok, json }-objekt räcker inte.
export const mockGraphql = (body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }),
      ),
    ),
  )
