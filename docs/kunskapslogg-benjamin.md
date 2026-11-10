### Siktar på VG

Ja

## M0 Vecka 38 – Ramverket och arbetssättet

**Kursmål:** Fullstack 4

### Vad jag förstått

**Fullstack 4:** Under veckan har jag kikat närmare på skillnaderna mellan Vue och React. För att testa det i praktiken fick vi konvertera en enklare React-app till Vue i ett eget repo. Dessutom har jag gått igenom olika vanliga Git-workflows, som GitHub Flow, Gitflow och Trunk-based.

### Var det syns i mitt arbete

**Fullstack 4:** Sektionen Branchstrategi i `docs/README.md/`

### Kvar att förstå

Många Vue grunder och hur man bakar in typescript. Jag behöver öva upp färdigheter att faktiskt kunna manövrera Vue effektivt i ett projekt.

## M1 Vecka 39 – Routing, state och den första pipelinen

**Kursmål:** Fullstack 5, Cloude 3 och 10

### Vad jag förstått

**Fullstack 5:** Denna vecka har jag lärt mig om hur man konfigurerar ihop nya workspaces och bygger smidiga shortcut kommandon i package-json för att underlätta migreringen från web till client. Jag har lärt mig skillnaden i syntax mellan Vue Router och React Router samt fått en översikt över Pinia och dess funktionalitet. 

**Cloude 3 och 10:** Vi har tillsammans byggt en pipeline från scratch och kopplat på byggen på den såsom linter och formater kombinerat med branch protection rules.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "fix-pipeline"

Jag satte upp vår befintliga pipeline i teamprojektet.

### Kvar att förstå

Pinia vill jag förstå mer på djupet. Samt pipelines och hur man kan göra en mer gedigen sådan.

## M2 Vecka 40 – TypeScript genom stacken och kvalitetssäkring

**Kursmål:** Fullstack 3 och 12, Cloude 5 och 6

### Vad jag förstått

**Fullstack 3 och 12:**  Stark repetetion i typescript där vi lagt till typer i /shared både för backend och frontend. Jag har fått en bättre förståelse för hur man skapar en store och syftet med pinia. Förståelse för hur man skapar tester av olika slag, enhetstester, komponenttester och end to end (test-pyramiden). 

**Cloude 5 och 6:** Bättre förståelse för pipelines och hur man lägger in typecheck som ett jobb.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "api-to-typescript", "client-type-implementation", "pinia-store"

Omvandlat filer från js till typescript i både backend och frontend och hanterat typer. Implementerade hela auth-storen med hjälp av pinia.

### Kvar att förstå

Bli bättre på att hantera typer och förstå dess användning i backend. Vill få en djupare förståelse för hur man kan använda en store i flera scenarion. Djupare förståelse för regressionstester. 

## M3 Vecka 41 – NoSQL och containrar

**Kursmål:** Fullstack 1, 10 och 19, Cloude 4 och 7

### Vad jag förstått

**Fullstack 1, 10 och 19:** Grundläggande förståelse för noSQL databaser och dess syfte. Fördelar och nackdelar med SQL respektive noSQL.

**Cloude 4 och 7:** Lärt mig om docker och hela kedjan, dockerfile - docker-compose. Syftet med docker-compose och att starta flera containrar samtidigt. Problematiken med utvecklingsmiljö där alla kör lokalt (olika paket). 

### Var det syns i mitt arbete

**Branches jag jobbat i:** "document-model, "docker-guide-readme", "containerized-to-docker"

### Kvar att förstå

Fördjupning i noSQL och mongoDB med mer praktiskt användande för att få bättre färdigheter. Ytterliggare fördjupning inom docker, hur man kan få ner data-användningnen och hur man bygger t.ex. en docker image i pipeline.

### M4 Vecka 42 – GraphQL-API v1

**Kursmål:** Fullstack 2, 11 och 19, Cloude 3, 4, och 10

### Vad jag förstått

**Fullstack 2, 11 och 19:** Översiktlig förståelse i vad graphQL är och dess användningsområden. Skapat förståelse för hur man kombinerar ett restAPI med graphQL och vad dess arkitektur innebär. Skapat förståelse i hur data-lagring och prestanda påverkas beroende av arkitektoniska beslut. 

**Cloude 3, 4 och 10:** Förståelse för hur man kan effektivisera data-lagring i en dockerfile med hjälp av multi-stage och nginx. Lärt mig att bygga och paketera container-images i en pipeline för att senare kunna drivsätta i en molnmiljö.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "docker-image-pipeline, m4-final-docs"

### Kvar att förstå

Djupare förståelse för graphQL och hur man praktiskt skriver resolvers och mutationer. Hur man bygger ett stabilt skottsäkert graphQL API och hur man löser N+1 propblemet som uppstår.

### M5 Vecka 43 – Typad end to end

**Kursmål: Fullstack 2, 11, 12, Cloud 6, 11** 

### Vad jag förstått

**Fullstack 2, 11 och 12:** Lärt mig hur man löser N+1 problemet i GraphQL med DataLoader så att databasfrågorna batchas per anrop, och varför svaren måste komma tillbaka i rätt ordning med hjälp av en Map. Jag har också fått förståelse för hur turloggar migreras till MongoDB och hur codegen tillsammans med urql kopplar ihop API-schemat med klientens typer så fel fångas i typecheck.

**Cloude 6, 11:** Förståelse för skillnaden mellan mockade klienttester och riktiga integrationstester mot Postgres och MongoDB i backend. Lärt mig hur man sätter upp ett integration-jobb i pipelinen med databas-services som seedas före testerna körs, och hur man skriver ett test som direkt märker om N+1 kommer tillbaka.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "migrate-meassurements, integration-test"

### Kvar att förstå

Jag vill få en bättre förståelse för hur urql:s cache fungerar när data ändras via mutationer. Även hur man i nästa steg tar våra images och kör dem i en riktig molnmiljö.

### M6 Vecka 44 – I molnet

**Kursmål: Cloud 1, 7, 10** 

### Vad jag förstått

**Cloude 1, 7, 10:** Under veckan har jag lärt mig jämföra molnplattformar och varför vi valde Azure Container Apps för staging framför till exempel Cloud Run och ECS på Fargate. Jag har också förstått hur man gör en app molnfärdig genom att läsa konfiguration utifrån, rensa bort och rotera hemligheter samt skicka med commitens sha. Slutligen hur pipelinen loggar in i Azure utan lösenord med hjälp av OIDC.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "deploy-to-azure"

### Kvar att förstå

Hur man sätter upp managed databaser i en riktig produktionsmiljö och hur man bryter ut tungt CPU-arbete från API:et med serverless.

### M7 Vecka 45 – Ut ur request-tråden 

**Kursmål: Cloud 2, 12** 

### Vad jag förstått

**Cloude 2, 12:** Under veckan har jag lärt mig hur man flyttar CPU-tungt arbete ur API:ets enda Node-tråd till en serverless-funktion i Azure Functions, så att resten av API:et fortsätter svara snabbt under last medan funktionen skalar ut per anrop. Jag har också förstått skillnaden mellan portabel kod och plattformsinlåsning, hur funktionsnyckeln skyddas med secretRef och varför Serverless Framework valdes bort. Samt skillnaden mellan kallstart efter vila och en varm instans för svarstiden och hur denna process tar bort CPU-arbetet från API:ets event-loop.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "azure-function, upload-image-azure, m7-implementations"

### Kvar att förstå

Hur man gör flödet helt asynkront med en kö när användaren inte behöver vänta på svaret direkt, samt hur man sätter upp övervakning och larm i Azure.










