# Skuldinventering

Det här är vår backlog över teknisk skuld i projektet. Listan rangordnas efter **risk**, inte
efter vad som stör oss mest när vi läser koden.

**Allvar:**
- **Hög** – kan ge dataläckor, avbrott eller fel data
- **Medel** – bromsar varje ändring
- **Låg** – stör men kostar lite

| # | Vad | Var (fil och rad) | Varför det är ett problem | Allvar |
|---|-----|--------------------|-----------------------------|--------|
| 1 | Klienten hämtar data på två olika sätt | `web/src/pages/Guides.jsx` rad 9 (rå fetch), `web/src/pages/Home.jsx` rad 14 (via api.js) | API-adressen och felhanteringen måste ändras på flera ställen, och det är lätt att missa ett | Medel |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |
