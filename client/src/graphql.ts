export const GRAPHQL_URL = '/graphql'

// Ett vanligt fetch-anrop – inget klientbibliotek (det kommer i M5, med cache och codegen).
// Alltid POST till samma adress; frågan och variablerna går i bodyn.
// Anroparen säger vilken form svaret har: gql<HomeData>(query). Typen skrivs för hand i dag,
// och ingen kontrollerar att den stämmer med frågan. Det är M5:s problem.
export const gql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] }
  // GraphQL svarar 200 även när frågan gick fel – felen ligger i body.errors, inte i statuskoden.
  if (body.errors?.length) throw new Error(body.errors[0]!.message)
  if (!body.data) throw new Error(`GraphQL svarade ${res.status} utan data`)
  return body.data
}
