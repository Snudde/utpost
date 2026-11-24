# Beslutsdokument: Headless CMS för redaktionens innehåll (M9)

*Ett av teamets beslutsdokument. Skrivs i M9 och hålls levande tillsammans med `hosting.md`, `api-stil.md`, `databas.md`, `serverless.md` och `testing.md`.*

**Datum:** 2026-11-24  
**Beslut:** Redaktionens innehåll, alltså **notiser** och **guidernas brödtext**, flyttar från Postgres (`guides.body_html`) till **Contentful**. Det är bara API:et som pratar med Contentful, och bara i [`api/src/cms/contentful.js`](../../api/src/cms/contentful.js). Klienten frågar som förut `/graphql` och får texten som stycken av textbitar (`[Paragraph]`), inte som HTML. Guidernas metadata (titel, region, svårighetsgrad, längd) ligger kvar i Postgres, och raderna kopplas ihop med Contentful via `slug`.

---

## Bakgrund

- **Redaktionen var beroende av utvecklarna.** En ändrad guidetext eller en ny notis krävde en databasändring eller en deploy.
- **HTML i databasen renderades med `v-html`.** Det gav ett ställe där en tagg i innehållet kunde bli kod (H7 i M8).
- **Det fanns inget utkastläge.** Redaktören kunde inte se en text innan den blev publik.

---

## Alternativ vi jämförde

| Alternativ | För | Emot |
|---|---|---|
| **Contentful (SaaS), valt** | Inget att drifta. Delivery- och preview-API:et ger publicerat och utkast med två nycklar. Inbyggda webhooks, rich text med begränsade blocktyper och ett redaktörsgränssnitt från dag ett. Gratisnivån räcker för oss. | Innehållet ligger hos en extern leverantör. Gratisnivån har tak för antal anrop och poster. Innehållsmodellen bor i Contentful och inte i Git (bara skripten som skapar den finns i repot). |
| **Strapi (self-hosted), bortvalt** | Öppen källkod. Innehållsmodellen är kod i repot. Data i vår egen Postgres, ingen extern leverantör. | Ännu en tjänst att drifta i Container Apps, med egen databas, egna uppgraderingar, egna säkerhetsuppdateringar och eget admin-gränssnitt att skydda. Det tar av kvoten som staging och funktionen redan delar, och teamet får ett system till att hålla igång i stället för att bygga Utpost. |
| **Behålla `body_html` i Postgres** | Inget nytt system. | Löser ingenting: redaktionen är fortfarande beroende av utvecklarna, det finns inget utkastläge och HTML behöver fortfarande renderas. |

**Avgörande:** för ett litet team som samtidigt bygger Utpost väger "inget att drifta" tyngre än "innehållsmodellen som kod". Strapi skulle ge oss mer kontroll, men också en tjänst till som kan gå sönder i staging.

---

## Innehållsmodellen

Båda typerna skapas av skript i repot och går att köra om utan att något dubbleras, eftersom de använder fasta id:n och `PUT`: [`scripts/cms-setup.mjs`](../../scripts/cms-setup.mjs) (`npm run cms:setup`) och [`scripts/migrate-guides.mjs`](../../scripts/migrate-guides.mjs) (`npm run cms:migrate-guides`).

**`notis`**

| Fält | Typ | Regler |
|---|---|---|
| `rubrik` | Symbol | krävs, max 80 tecken |
| `text` | Rich text | krävs. Bara stycken och länkar, märken: fet och kursiv |
| `niva` | Symbol | krävs, `info` eller `varning` |
| `guideSlug` | Symbol | valfri, `^[a-z0-9-]+$`, kopplar notisen till en guide |

**`guide`**, med 40 poster migrerade ur `guides.body_html` till id:n på formen `utpost-guide-<slug>`:

| Fält | Typ | Regler |
|---|---|---|
| `title` | Symbol | krävs, max 120 tecken |
| `slug` | Symbol | krävs, unik, `^[a-z0-9-]+$`, är nyckeln mot raden i Postgres |
| `text` | Rich text | krävs. Stycken, H2, H3, punktlistor och länkar, märken: fet och kursiv |

Rich text är ett träd av noder och inte HTML. `toParagraphs()` i `contentful.js` formar om det till schemats `Paragraph { runs { text bold italic href } }`. Blocktyper vi inte känner till hoppas över, och länkar som inte är `http(s)://` eller `/` blir ingen länk alls. Klienten visar resultatet med [`RichText.vue`](../../client/src/components/RichText.vue) utan `v-html`.

**Nycklarna:** delivery- och preview-nyckeln finns bara på servern. I staging ligger de som secrets i containerappen ([`infra/azure/cms-till-staging.sh`](../../infra/azure/cms-till-staging.sh)), och klienten ser dem aldrig. Management-token används bara av skripten på en utvecklares dator och skickas aldrig till molnet.

**Utkast och publicering:** `notices(preview: true)` och `guide(..., preview: true)` kräver rollen editor, och andra får `FORBIDDEN`. Publicerat innehåll cachas i 60 sekunder (`CMS_CACHE_SECONDS`). Webhooken `POST /api/cms/webhook`, skyddad med `x-utpost-webhook-secret`, tömmer cachen direkt vid publicering. Den har tester som var röda före routen ([PR #83](https://github.com/Snudde/utpost/pull/83), se `docs/testing.md`). Är Contentful nere svarar API:et med det senast hämtade eller med en tom lista, och resten av sidan fungerar.

---

## Vad som hade fått oss att byta

- **Gratisnivån räcker inte längre**, till exempel för att antalet anrop eller poster växer förbi taket, eller för att vi behöver fler roller och miljöer än gratisnivån ger. Då väger driften av Strapi lättare än en månadskostnad.
- **Innehållet måste ligga inom EU eller hos oss** av juridiska skäl eller avtalsskäl.
- **Innehållsmodellen behöver versioneras och granskas som kod** i samma PR som koden som använder den.
- **Contentful ändrar villkor eller API** på ett sätt som slår mot oss.

**Vad ett byte kostar:** CMS:et är inkapslat. Det är `api/src/cms/contentful.js` som skrivs om, plus de två skripten och webhooken. GraphQL-schemat, resolvers och klienten påverkas inte, eftersom de bara känner till `Paragraph` och `Notice`.

---

## Konsekvenser

- **Bra:** redaktören publicerar själv, och ändringen syns direkt tack vare webhooken. Inget `v-html` finns kvar i klienten. Utkast syns bara för editor.
- **Risker vi accepterar:**
  - Ett beroende av en extern tjänst till. Det mildras av cachen och reservsvaret med en tom lista.
  - En guide består av två källor (Postgres och Contentful) som kopplas ihop med `slug`. Byter en guide slug i bara den ena källan tappar den sin text.
  - CI testar CMS-lagret med mockad fetch, inte mot riktiga Contentful. Att det fungerar på riktigt kontrolleras i staging.
