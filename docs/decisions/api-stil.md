# Beslutsdokument: API-stil

_Ett av teamets sex beslutsdokument. Skrivs i M4, hålls levande. Samma mall som `testing.md` och `databas.md`._

**Datum:** 2026-10-15
**Beslut:** _(en eller två meningar: ersätter GraphQL REST, kompletterar det, eller stannar ni på REST för vissa delar? Vilka?)_

## Bakgrund

Skuld 6: klienterna hämtar mycket mer data än de visar, och startsidan behöver flera anrop
för att få ihop en sida. Mätt 2026-10-15 på seedad dev-databas med API:et i compose
(`curl -s … | wc -c` per endpoint, databasfrågor ur API-loggen).

| Vy         | REST: anrop | REST: byte | GraphQL: anrop | GraphQL: byte | Databasfrågor (API-loggen) |
| ---------- | ----------- | ---------- | -------------- | ------------- | -------------------------- |
| Startsidan | 5           | 31 001     | 1              | 5 603         | REST 4 + health, GraphQL 4 |
| Turlistan  | 1           | 282 392    | 1              | 7 294         | REST 189, GraphQL 139      |

**Startsidan** (`web/src/pages/Home.jsx`) gör fem REST-anrop:

| Endpoint              | Byte   | Används på sidan                                               |
| --------------------- | ------ | -------------------------------------------------------------- |
| `/api/guides`         | 26 171 | slug, titel, region, svårighet, längd + 180 tecken `body_html` |
| `/api/guides/popular` | 3 926  | samma fält                                                     |
| `/api/guides/regions` | 96     | bara antalet regioner                                          |
| `/api/tours/latest`   | 748    | id, titel, längd                                               |
| `/api/health`         | 60     | versionsnumret                                                 |

Utan `body_html` är `/api/guides` 4 673 byte i stället för 26 171, alltså går ungefär 82 % av
det största svaret till brödtext som kortet klipper efter 180 tecken. GraphQL-frågan `Home`
(`client/src/views/HomeView.vue`) hämtar startsidans data i ett anrop och utan `bodyHtml`.
Health hör inte till frågan och stannar i REST.

**Turlistan** visar titel, användare, guide, längd och antal bilder. `GET /api/tours` skickar
hela raderna inklusive alla mätpunkter och användarraden med `password_hash` och `email`.
GraphQL-frågan ber bara om vyns fält:
`tours(limit: 50) { id title distanceM user { displayName } guide { title } photos { id } }`.

- Svaret krymper med 97 % (282 392 → 7 294 byte), svarstiden lokalt från 0,11–0,13 s till 0,04–0,05 s.
- REST gör 189 databasfrågor: 1 + 50 × (user, photos, logs) + 38 turer som har guide.
- GraphQL gör 139: 1 + 50 user + 38 guide + 50 photos. Färre byte löser alltså inte N+1;
  varje relation är fortfarande en fråga per tur (åtgärdas i M5).

## Schemat i korthet

Schemat ligger i `api/src/graphql/schema.js` och är kontraktet mot klienterna.

**Typer:** `Guide`, `Tour`, `User`, `Photo`, `LogPoint`.

**Query:**

| Ingång                     | Returnerar   | Kommentar                            |
| -------------------------- | ------------ | ------------------------------------ |
| `guides`                   | `[Guide!]!`  | alla guider, senast uppdaterad först |
| `guide(slug)`              | `Guide`      | `null` om sluggen inte finns         |
| `popularGuides(limit = 6)` | `[Guide!]!`  | publicerade guider, nyast först      |
| `regions`                  | `[String!]!` | unika regioner                       |
| `tours(limit = 50)`        | `[Tour!]!`   | senaste turerna, max 200 per anrop   |
| `tour(id)`                 | `Tour`       | `null` om id:t inte finns            |

**Mutation:** `createTour(input: CreateTourInput!)`, kräver `Authorization: Bearer <token>`.

**Fältnamn:** fälten heter i camelCase (`lengthKm`, `distanceM`, `displayName`) eftersom det är
så klienterna i JavaScript/TypeScript vill läsa dem. Kolumnerna i Postgres heter i snake_case
(`length_km`) och är databasens sak. Översättningen görs i fältresolvrarna i `resolvers.js`,
så kan vi byta kolumnnamn, eller flytta turer till MongoDB, utan att klienterna märker det.

**Relationer i stället för främmande nycklar:** `tour.user`, `tour.guide`, `tour.photos` och
`tour.logs` är objekt, inte id:n. `user_id`, `guide_id`, `author_id` och `tour_id` finns inte i
schemat; klienten frågar efter det den vill ha i stället för att göra ett nytt anrop med id:t.

**Medvetet utanför schemat:**

| Utelämnat                                   | Varför                                         |
| ------------------------------------------- | ---------------------------------------------- |
| `users.password_hash`                       | får aldrig lämna servern                       |
| `users.email`                               | personuppgift; andra användare ska inte se den |
| `users.role`                                | intern behörighet, inget klienten ska visa     |
| främmande nycklar (`user_id`, `guide_id` …) | ersatta av relationer                          |
| `tour_logs.id`, `tour_logs.note`            | används inte av någon vy                       |
| `photos.created_at`                         | används inte av någon vy                       |

Det som inte står i schemat går inte att fråga efter, även om resolvern läser `select *`.
REST har inget sådant filter: `GET /api/tours` skickar i dag ut `password_hash` och `email`.

**Öppen fråga:** `guides` och `guide(slug)` returnerar även opublicerade utkast (5 av 40 i
seed-datan). Antingen filtrerar vi på `published` eller så hör utkasten till en framtida
inloggad redaktörsvy.

## Vad som går via GraphQL och vad som stannar i REST

Tumregel: **läsningar som en vy sätter ihop av flera resurser går via GraphQL. Det som inte
är data i en vy, eller där HTTP själv gör jobbet, stannar i REST.**

| Endpoint i dag                                 | Blir              | Motivering                                                                                                                          |
| ---------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/guides`, `/popular`, `/regions`      | GraphQL           | startsidan behöver alla tre plus turer; ett anrop i stället för fyra, och utan `body_html`                                          |
| `GET /api/guides/:slug`                        | GraphQL           | `guide(slug)`; guidesidan väljer själv om den vill ha `bodyHtml`                                                                    |
| `GET /api/tours`, `/tours/latest`              | GraphQL           | `tours(limit)`; turlistan krymper från 282 kB till 7 kB och läcker inte längre `password_hash`                                      |
| `GET /api/tours/:id`                           | GraphQL           | `tour(id)` med `logs` och `photos` i samma fråga                                                                                    |
| `POST /api/tours`                              | GraphQL           | `createTour` finns redan; svaret kan be om exakt de fält vyn visar efteråt                                                          |
| `DELETE /api/tours/:id`, `PUT /api/guides/:id` | REST tills vidare | inga vyer i den nya klienten använder dem än; flyttas som mutationer när de behövs                                                  |
| `GET /api/guides/search`                       | REST tills vidare | flyttas till `searchGuides(q)` när sökvyn byggs om                                                                                  |
| `POST /api/auth/login`, `/register`            | REST              | inloggning är en enkel handling som ger en token, inte en graf att fråga i; tokenen används sedan i `Authorization` för båda        |
| `POST /api/photos`                             | REST              | uppladdning är fil-/binärdata; GraphQL har ingen standard för filer och skulle kräva multipart-tillägg                              |
| `GET /api/photos/tour/:tourId`                 | GraphQL           | ersätts av `tour { photos }`                                                                                                        |
| `GET /api/health`                              | REST              | ska svara även om GraphQL-schemat eller en resolver är trasig; övervakning och Docker vill ha en statuskod, inte `200` med `errors` |

## Alternativ vi jämförde

_Minst två riktiga alternativ, t.ex. "laga REST-endpointsen" (smalare svar, en sammansatt endpoint för startsidan) och "GraphQL för allt". Vad talar för och emot vart och ett?_

## Konsekvenser

**Cachning.** Alla GraphQL-anrop är `POST /graphql`, så webbläsarens och proxyernas HTTP-cache
gör ingenting. REST-svar som `GET /api/guides` kan cachas med vanliga headers. Med GraphQL får vi
cacha i klienten i stället, vilket kräver ett klientbibliotek (planerat i M5). Fram till dess
hämtar varje vy om allt varje gång.

**Felhantering i klienten.** GraphQL svarar `200 OK` även när frågan går fel; felen ligger i
`body.errors`. `res.ok` räcker alltså inte. `client/src/graphql.ts` kastar därför ett fel när
`errors` finns. Ett svar kan också ha både `data` och `errors` (delvis lyckat). Det hanterar vi
inte i dag – vi kastar på första felet.

**N+1 i resolvers.** Varje relation är en databasfråga per rad. Turlistan går från 189 till
139 databasfrågor, inte till en handfull, och den som lägger till `logs` i frågan får 50 till.
Mindre svar betyder alltså inte mindre databaslast. Åtgärdas i M5 med batchning (DataLoader)
eller när turer flyttar till MongoDB (se `databas.md`). API-loggen skriver antalet frågor per
operation så att vi ser det.

**Klienten bestämmer kostnaden.** En klient kan skriva en dyr fråga, t.ex. `tours(limit: 200)`
med `logs`. Vi har ett tak på 200 i `tours`, men inget djup- eller kostnadsskydd i övrigt.

**Två sätt att prata med API:et under migreringen.** React-klienten (`web/`) använder REST,
Vue-klienten (`client/`) både `get`/`post` i `api.ts` och `gql` i `graphql.ts`. Samma data finns
bakom två endpoints med olika fältnamn (`distance_m` vs `distanceM`), och en buggfix eller
behörighetsregel måste göras på båda ställen tills REST-endpointen tas bort.

**Typer för hand.** Svarstypen skrivs för hand, `gql<HomeData>(...)`, och ingen kontrollerar
att den stämmer med frågan eller schemat. Ett stavfel i ett fältnamn märks först i körning.
Löses med codegen från schemat (M5).

**Det vi vinner.** Svaren krymper kraftigt (startsidan 31 kB → 5,6 kB, turlistan 282 kB → 7 kB),
startsidan blir ett anrop i stället för fem, och schemat är ett filter: fält som `password_hash`
kan inte läcka eftersom de inte går att fråga efter.

**Skrivet av:**
