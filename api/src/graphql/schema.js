// GraphQL-schemat för Utpost, v1 (M4). Det här ÄR kontraktet: allt en klient kan fråga efter
// står här, med typer. Fälten heter som klienten vill ha dem (camelCase) – inte som kolumnerna
// i Postgres. Översättningen görs i resolvers.js.
export const typeDefs = /* GraphQL */ `
  type Guide {
    id: ID!
    slug: String!
    title: String!
    region: String!
    difficulty: String!
    lengthKm: Float!
    body(preview: Boolean = false): [Paragraph!]! 
    heroImage: String
    published: Boolean!
    updatedAt: String!
    "Redaktionens notiser som gäller just den här guiden (M9) – ur CMS:et, ihopkopplade här"
    notices: [Notice!]!
  }

   "En textbit i ett stycke. Rich text som data: klienten bestämmer hur fet text och länkar ser ut."
  type TextRun {
    text: String!
    bold: Boolean!
    italic: Boolean!
    "Vart textbiten länkar, om den är en länk"
    href: String
  }

  type Paragraph {
    runs: [TextRun!]!
  }

  "En notis från redaktionen. Innehållet bor i CMS:et (M9), inte i databasen."
  type Notice {
    id: ID!
    title: String!
    "info eller varning – vad notisen ÄR, inte vilken färg den har"
    level: String!
    body: [Paragraph!]!
    "Vilken guide notisen gäller. Tom = gäller hela Utpost"
    guideSlug: String
    "published, draft eller changed. Annat än published syns bara i förhandsgranskningen"
    status: String!
  }

  type User {
    id: ID!
    displayName: String!
  }

  type Photo {
    id: ID!
    filename: String!
    width: Int!
    height: Int!
  }

  type LogPoint {
    recordedAt: String!
    lat: Float!
    lon: Float!
    elevationM: Int
    heartRate: Int
  }

  type Tour {
    id: ID!
    title: String!
    startedAt: String!
    distanceM: Int!
    notes: String
    user: User!
    guide: Guide
    photos: [Photo!]!
    logs: [LogPoint!]!
  }

  type Query {
    "Alla guider, senast uppdaterad först"
    guides: [Guide!]!
    "Publicerade guider, nyast först – det startsidan kallar populärast"
    popularGuides(limit: Int = 6): [Guide!]!
    guide(slug: String!, preview: Boolean = false): Guide
    regions: [String!]!
    "Redaktionens notiser. preview: true visar även utkast – kräver inloggning med rollen editor"
    notices(preview: Boolean = false): [Notice!]!
    "Senaste turerna"
    tours(limit: Int = 50): [Tour!]!
    tour(id: ID!): Tour
  }

  input CreateTourInput {
    title: String!
    guideId: ID
    startedAt: String!
    distanceM: Int!
    notes: String
  }

  type Mutation {
    "Kräver inloggning: Authorization: Bearer <token>"
    createTour(input: CreateTourInput!): Tour!
  }
`;