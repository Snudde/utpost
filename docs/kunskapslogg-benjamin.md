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

**Fullstack1 1, 10 och 19:** Grundläggande förståelse för noSQL databaser och dess syfte. Fördelar och nackdelar med SQL respektive noSQL.

**Cloude 4 och 7:** Lärt mig om docker och hela kedjan, dockerfile - docker-compose. Syftet med docker-compose och att starta flera containrar samtidigt. Problematiken med utvecklingsmiljö där alla kör lokalt (olika paket). 

### Var det syns i mitt arbete

**Branches jag jobbat i:** "document-model, "docker-guide-readme", "containerized-to-docker"

### Kvar att förstå

Fördjupning i noSQL och mongoDB med mer praktiskt användande för att få bättre färdigheter. Ytterliggare fördjupning inom docker, hur man kan få ner data-användningnen och hur man bygger t.ex. en docker image i pipeline.

### M4 Vecka 42 – GraphQL-API v1

**Kursmål:** Fullstack 2, 11 och 19, Cloude 3, 4, och 10

### Vad jag förstått

**Fullstack1 2, 11 och 19:** Översiktlig förståelse i vad graphQL är och dess användningsområden. Skapat förståelse för hur man kombinerar ett restAPI med graphQL och vad dess arkitektur innebär. Skapat förståelse i hur data-lagring och prestanda påverkas beroende av arkitektoniska beslut. 

**Cloude 3, 4 och 10:** Förståelse för hur man kan effektivisera data-lagring i en dockerfile med hjälp av multi-stage och nginx. Lärt mig att bygga och paketera container-images i en pipeline för att senare kunna drivsätta i en molnmiljö.

### Var det syns i mitt arbete

**Branches jag jobbat i:** "docker-image-pipeline, m4-final-docs"

### Kvar att förstå

Djupare förståelse för graphQL och hur man praktiskt skriver resolvers och mutationer. Hur man bygger ett stabilt skottsäkert graphQL API och hur man löser N+1 propblemet som uppstår.







