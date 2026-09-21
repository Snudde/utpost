# Skuldinventering

Det här är vår backlog över teknisk skuld i projektet. Listan rangordnas efter **risk**, inte
efter vad som stör oss mest när vi läser koden.

**Allvar:**
- **Hög** – kan ge dataläckor, avbrott eller fel data
- **Medel** – bromsar varje ändring
- **Låg** – stör men kostar lite

| # | Vad | Var (fil och rad) | Varför det är ett problem | Allvar |
|---|-----|--------------------|-----------------------------|--------|
| 1 | Hemligheter hårdkodade i incheckad fil | api/src/config.js:2-6 | JWT-secret och DB-lösenord ligger i klartext i git. Läcker repot kan tokens förfalskas (även admin) och all auth kringgås. | Hög |
| 2 | SQL-injektion i sök | api/src/routes/guides.js:22-26 | req.query.q klistras rakt in i SQL-strängen istället för att parametriseras. Ger full läs/skriv-access till databasen. | Hög |
| 3 | Delete-endpoint helt utan auth | api/src/routes/tours.js:47-51 | DELETE /:id saknar requireUser (till skillnad från POST /). Vem som helst kan radera andras turer utan token. | Hög |
| 4 | Ovaliderad bilddimension | api/src/routes/photos.js:39-43 | width/height från req.body går rakt in i en Uint8Array-allokering utan gräns. Ett stort värde kraschar/DoS:ar servern. | Hög |
| 5 | Lösenord sparas i klartext | api/src/routes/auth.js:8-25 | Sparas/jämförs som `plaintext:${password}` trots kolumnnamnet password_hash. Läcker DB:n exponeras alla lösenord direkt. | Hög |
| 6 | CPU-tung bildbehandling blockerar servern | api/src/routes/photos.js:10-49 | Bildomskalning med nästlade pixel-loopar körs synkront i event loop-tråden. Blockerar hela servern under varje uppladdning. | Hög |
| 7 | JWT utan återkallningsmöjlighet | web/src/pages/Login.jsx:18-19, api/src/lib/auth.js:5 | Token sparas i localStorage och gäller 30 dagar, ingen logout/blocklist. Stöld eller XSS ger långvarig åtkomst. | Hög |
| 8 | N+1-queries i turlistan | api/src/routes/tours.js:7-22 | Loop med await gör 4 sekventiella queries per tur istället för en join. Bromsar allt vid skalning. | Medel |
| 9 | Fel sväljs globalt istället för att hanteras per route | api/src/index.js:25-29 | unhandledRejection loggar bara felet, routes saknar try/catch. Requests hänger tyst istället för att svara med felkod. | Medel |
| 10 | Duplicerad, oanvänd komponent | web/src/components/PrimaryButton.jsx | Klassbaserad kopia av Button.jsx, importeras aldrig. Skapar osäkerhet om vilken komponent som gäller. | Låg |
