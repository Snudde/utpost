# Beslutsdokument: hostingval

*Ett av teamets sex beslutsdokument. Skrivs i M6, hålls levande. Samma mall som `api-stil.md`, `databas.md` och `testing.md`. Det här dokumentet examinerar Cloud 1 (redogöra för hostinglösningar som AWS, Azure, Google Cloud) – skriv så att en läsare utan Azure-konto förstår valet.*

**Datum:** 2026-11-06
**Beslut:** Staging kör i **Azure Container Apps** (Sweden Central) som en enda app med fyra containrar – klient, API, Postgres och MongoDB – som skalar till noll och seedar en tom databas vid varje kallstart. I produktion behåller vi samma images och samma pipeline, men byter databas-containrarna mot managed databaser och låter appen alltid ha minst en instans igång.

## Bakgrund

Efter M5 hade vi två images i GitHub Container Registry (GHCR), `utpost-api` och `utpost-client`, taggade med commitens sha, en pipeline som bygger och testar dem, och `compose.yml` för att köra allt lokalt. Allt fungerade – men bara på våra egna datorer. Ingen utanför teamet kunde öppna appen, och ingen kunde se vilken version som faktiskt var "den senaste".

Kursens krav för M6:
- **Automatisk deploy till staging** vid varje merge till `main` – ingen människa ska behöva klicka.
- **Secrets ur koden** – `JWT_SECRET` och databaslösenorden ska inte finnas i repot.
- **En publik URL** som vem som helst kan öppna.

Vi behövde alltså en plats att köra containrar på, ett sätt för pipelinen att logga in där utan lösenord, och ett sätt att veta att staging verkligen kör den commit som just mergades (`/api/health` svarar med `sha`).

## Vad vi faktiskt hyr

Allt ligger i resursgruppen `utpost-benjamin-klingberg-rg` i Sweden Central. Appen heter `utpost-staging` och nås på https://utpost-staging.blackglacier-52e63275.swedencentral.azurecontainerapps.io.

| Del | Tjänst | Nivå | Vem sköter uppdateringar/skalning | Vad det kostar oss i staging |
|---|---|---|---|---|
| Klient + API | Azure Container Apps (Consumption), containrarna `client` (0,25 vCPU / 0,5 GiB) och `api` (0,5 vCPU / 1 GiB) | PaaS / serverless | Azure sköter servrar, OS och skalning (0–1 instans). Vi sköter våra images. | 0 kr när appen sover. Hela appen (1,75 vCPU / 3,5 GiB) ryms i gratiskvoten i ca 28 timmar aktiv tid per månad – men kvoten delas av alla i prenumerationen. |
| Postgres | `postgres:16` som sidecar-container i samma app (0,5 vCPU / 1 GiB) | Vi kör den själva i en PaaS | Vi: ingen backup, ingen volym, ingen uppdatering förutom image-taggen | Ingår i appens kostnad ovan |
| MongoDB | `mongo:8.2` som sidecar-container i samma app (0,5 vCPU / 1 GiB) | Vi kör den själva i en PaaS | Vi, som för Postgres | Ingår i appens kostnad ovan |
| Images | GHCR (`ghcr.io/snudde/utpost-api`, `-client`) | SaaS | GitHub | 0 kr – publika paket är gratis |
| Deploy | GitHub Actions → Azure (OIDC-inloggning, `az containerapp update`) | SaaS | GitHub (runners), Azure (Entra ID-identiteten) | 0 kr – Actions är gratis för publika repon |

Två saker vi medvetet valde bort för att hålla nere kostnaden: **ingen Log Analytics** (`--logs-destination none`; loggarna strömmas med `az containerapp logs show` i stället) och **ingen volym** för databaserna.

*Räkningen bakom "ca 28 timmar": gratiskvoten för Container Apps är 180 000 vCPU-sekunder och 360 000 GiB-sekunder per prenumeration och månad. 180 000 / 1,75 vCPU ≈ 103 000 s ≈ 28,6 h, och 360 000 / 3,5 GiB ger samma siffra. Därefter kostar aktiv tid ungefär 2 kr i timmen för hela appen.*

> Faktisk kostnad hittills: Azure-portalen → resursgruppen → *Cost analysis*. Den som har tillgång till resursgruppen (Benjamin, Kalle) kan läsa av siffran. I nuläget syns ingen kostnad då data saknas.

## Alternativ vi jämförde

| Alternativ | Vad ändras i repot | Kostnad (staging) | För | Emot |
|---|---|---|---|---|
| **Azure Container Apps** (valt) | `infra/azure/*`, deploy-jobbet i `ci.yml` | ~0 kr: skalar till noll, gratiskvot | Skalar till noll; sidecars låter oss köra hela compose-stacken som en app; OIDC från GitHub; HTTPS och URL ingår | Kallstart ~1 min; gratiskvoten delas av hela prenumerationen; sidecar-databaser är inte för produktion |
| **Azure App Service for Containers** | Ny infra-mall (App Service-plan + webbapp); deploy med `azure/webapps-deploy` | Fast månadskostnad för planen, även när ingen använder appen (Basic B1 ca 130 kr/mån) | Mogen, enkel, egen domän och certifikat ingår; ingen kallstart | Skalar inte till noll; flera containrar i samma app är krångligare (sidecar-stödet är nyare än i Container Apps) |
| **Google Cloud Run** | `infra/gcp/service.yaml` (Knative-format, stöder sidecars), deploy med `google-github-actions/auth` + `gcloud run services replace` | ~0 kr: skalar till noll, liknande gratiskvot | Närmast vårt val: samma modell med images, skala till noll, sidecars, OIDC via Workload Identity Federation | Annan leverantör = nytt konto, faktureringskonto och ny IAM-modell; kursens prenumeration ligger i Azure |
| **AWS ECS på Fargate** | Task definition (JSON), service, lastbalanserare; deploy med `aws-actions/configure-aws-credentials` + `amazon-ecs-deploy-task-definition` | Fargate per sekund, men en publik URL kräver en Application Load Balancer (ca 200 kr/mån även utan trafik) | Mycket kontroll; sidecars i samma task är standard; OIDC från GitHub | Skalar inte till noll av sig själv; mest infrastruktur att skriva och förstå |
| **En VM (IaaS) med docker compose** | Nästan inget: `compose.yml` används som den är; deploy blir `ssh` + `docker compose pull && up -d` | Fast pris per månad (en liten VM ca 100–300 kr/mån) | Databaserna kan få riktiga volymer; samma uppsättning som lokalt | Vi äger OS-uppdateringar, brandvägg, certifikat och omstarter; ingen skalning; ett SSH-lösenord eller en nyckel blir en ny hemlighet i GitHub |

*Priserna är ungefärliga listpriser och ska kontrolleras i respektive leverantörs priskalkylator innan de används i ett riktigt beslut.*

**Varför Container Apps:** det är det enda alternativet som samtidigt (1) kostar ingenting när ingen använder staging, (2) låter oss köra hela stacken, databaserna inräknade, som en app utan att köpa managed databaser för en testmiljö, och (3) tar emot exakt det vi redan har: två images och en pipeline. Cloud Run hade fungerat nästan lika bra; avgörande var att kursens prenumeration ligger i Azure.

## Staging och produktion är inte samma sak

Staging är byggd för att vara gratis och kunna slängas. Det är fel egenskaper för produktion.

| | Staging i dag | Produktion |
|---|---|---|
| Databaser | Sidecars utan volym, tomma och seedade vid varje kallstart (`SEED_ON_START=1`) | Managed: **Azure Database for PostgreSQL – Flexible Server** och **Azure Cosmos DB for MongoDB** (eller MongoDB Atlas). Data finns kvar mellan omstarter. |
| Backup | Ingen – det finns inget att spara | Automatisk backup med point-in-time restore (ingår i Flexible Server) |
| Skalning | `minReplicas: 0`, `maxReplicas: 1` | `minReplicas: 1` (ingen kallstart för användarna), `maxReplicas` > 1 – möjligt först när databaserna inte ligger i appen |
| Domän och certifikat | `*.azurecontainerapps.io` | Egen domän med hanterat certifikat (ingår i Container Apps) |
| Loggar | Inga sparade, bara `az containerapp logs show` | Log Analytics eller motsvarande, med larm |
| Hemligheter | Secrets direkt i Container App | Key Vault, som appen läser via sin managed identity |
| `SEED_ON_START` | `1` | `0` – produktion får aldrig seedas |

**Det som INTE behöver bytas:** imagerna (samma `sha`-taggade images går till båda miljöerna), Dockerfilerna, appens kod (allt läses ur miljövariabler), och pipelinens upplägg: produktion blir ett andra deploy-jobb med en egen GitHub-miljö, till exempel `azure-production` med ett manuellt godkännande, och samma steg som staging.

## Inlåsning

Om Azure försvann i morgon skulle vi behöva ändra:

- `infra/azure/staging.yaml` – ersätts av den nya plattformens beskrivning (t.ex. en Cloud Run-YAML)
- `infra/azure/skapa-staging.sh` – nytt skript för att skapa miljön
- `infra/azure/identitet.sh` – ny OIDC-koppling mellan GitHub och den nya leverantören
- `.github/workflows/ci.yml`, **bara jobbet Deploy**: inloggningssteget och steget som byter image. Väntesteget och röktestet anropar bara URL:en och kan stå kvar.
- Variablerna på GitHub-miljön `azure-staging` (byts mot den nya leverantörens id:n)
- `README.md` och `docs/pipeline.md` – avsnitten om staging

Det här ändras **inte**:

- `api/Dockerfile`, `client/Dockerfile`, `client/nginx.conf.template`
- All kod i `api/src/` och `client/src/` – konfigurationen kommer från miljön, inte från Azure
- `compose.yml` och `.env.example`
- Jobben Kvalitet, build, Integration och Image i `ci.yml`
- Imagerna i GHCR

Bytet rör alltså en mapp och ett jobb. Det beror på att vi bygger images i vår egen pipeline och lägger dem i ett register som inte tillhör Azure, i stället för att låta plattformen bygga från källkod. Det som är Azure-specifikt ligger samlat i `infra/azure/` och i ett enda jobb.

## Konsekvenser

- **Kallstart:** när appen har skalat till noll tar första anropet ungefär en minut. Fyra containrar startar och databaserna seedas. Det gäller både den som öppnar staging och deploy-jobbets väntesteg, som därför väntar i upp till fem minuter.
- **Data försvinner:** allt som skapas i staging, till exempel turer och konton, är borta efter nästa kallstart. Det är medvetet, men det betyder att staging inte går att använda för att visa upp något som byggts upp över tid.
- **Gratiskvoten delas:** kvoten gäller per prenumeration, och prenumerationen delas av alla i kursen. Använder andra team mycket kan vi börja betala, eller tvärtom. Att skala till noll är vårt sätt att ta så lite som möjligt.
- **Hemligheter på två ställen:** lokalt i `.env` (byggd från `.env.example`, aldrig committad) och i Azure som secrets. `JWT_SECRET` och databaslösenordet genereras med `openssl rand` i `skapa-staging.sh` och skrivs aldrig till någon fil. **Rotation:** `az containerapp secret set --name utpost-staging --resource-group <rg> --secrets jwt-secret=<nytt värde>` och därefter en ny revision (`az containerapp revision restart`). Alla som är inloggade loggas ut, eftersom deras tokens inte längre godtas. Lokalt byter var och en i sin egen `.env`.
- **Tillgång till portalen:** Benjamin och Kalle har tillgång till resursgruppen. De andra i teamet ser inte appen, loggarna eller kostnaderna, och kan inte köra `identitet.sh` eller hämta URL:en. Pipelinen klarar sig ändå: dess identitet har Contributor på resursgruppen och inget mer, och den loggar in med OIDC utan något lösenord i GitHub.

**Skrivet av:** **Kalle Salomonsson**
