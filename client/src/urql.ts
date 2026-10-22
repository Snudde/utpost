import { createClient, cacheExchange, fetchExchange } from '@urql/vue'

// M5: GraphQL-klienten. Ersätter gql() från M4 (ett fetch per anrop, ingen cache).
// Relativ adress som förut: nginx i containern och Vites dev-server skickar /graphql vidare till API:et.
//
// cacheExchange är urqls dokumentcache: samma fråga + samma variabler = svaret ur minnet, inget
// nätverksanrop (startsidan laddas en gång per besök, inte varje gång man klickar tillbaka).
// En mutation som returnerar en typ (t.ex. Tour) gör alla cachade frågor som innehåller den
// typen ogiltiga, så de hämtas om nästa gång – det är därför urql lägger till __typename i varje
// fråga. fetchExchange är det som faktiskt skickar anropet.
export const client = createClient({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
  // urql skickar annars korta frågor som GET med frågan i adressen. Vi håller oss till POST,
  // som i M4: en metod, en adress, frågan i bodyn – och GET /graphql i browsern är fortfarande GraphiQL.
  preferGetMethod: false,
})
