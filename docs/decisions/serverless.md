| Alternativ | Vad ändras i repot | För | Emot |
|---|---|---|---|
| Azure Functions med plattformens verktyg – valt | `functions/`, `skapa-funktion.sh`, jobbet `deploy-function` | samma moln och identitet som staging; skalar ut per anrop | triggern, `host.json` och deploysteget är Azure |
| Serverless Framework | en `serverless.yml` och `sls deploy` | en fil för funktionen och allt runt den | v4 stöder bara AWS och kräver inloggning, v3 underhålls inte, Azure-pluginet är arkiverat |