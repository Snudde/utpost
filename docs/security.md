# Säkerhet – Utpost

*Mall (M8). Byt ut exempelraderna mot era egna fynd. Minst tre rader ska ha ett riktigt fynd, en fix i en PR och ett test som var rött före fixen. "Gäller inte oss, för …" är också ett svar – men bara om det är sant. Listan följer OWASP Top 10 (2025).*

**Datum:** ______
**Hotbilden i en mening:** ______ (vad är värt att skydda i Utpost, och vem är angriparen? Användarnas turer och bilder, redaktionens guider, och – när vi lanserar – kontona. Angriparen är oftast ett skript, inte en person.)

## Autentiseringen (M8)

- Lösenord: ______ (hur lagras de, med vilket schema? Var i koden?)
- Token: ______ (vad står i den, hur länge gäller den, var ligger den i klienten, vad händer vid omladdning?)
- Skyddade routes: ______ (vilka anrop kräver token, vilka kräver rollen editor, och var sitter kontrollen – i klientens router eller i API:et?)

## OWASP Top 10 – genomgång

| # | Risk | Gäller oss? | Vad vi hittade (fil, endpoint) | Vad vi gjorde (PR) | Kontroll (testet som var rött före fixen, eller curl) |
|---|---|---|---|---|---|
| A01 | Broken Access Control | | | | |
| A02 | Security Misconfiguration | | | | |
| A03 | Software Supply Chain Failures | | | | |
| A04 | Cryptographic Failures | | | | |
| A05 | Injection | | | | |
| A06 | Insecure Design | | | | |
| A07 | Authentication Failures | | | | |
| A08 | Software or Data Integrity Failures | | | | |
| A09 | Security Logging & Alerting Failures | | | | |
| A10 | Mishandling of Exceptional Conditions | | | | |

## Validering av indata

______ (var sitter valideringen, vilka scheman finns, vad händer vid ogiltig indata – svarskoden och formen på svaret?)

## Headers vi sätter (nginx)

______ (`curl -I` mot staging – CSP och de andra säkerhetsheadrarna. Kommer i fredagens labb.)

## Skanning i pipelinen

______ (vilka verktyg kör i jobbet *Säkerhet*, vad hittar var och en, och vad gör jobbet rött. Kommer i fredagens labb.)

## Kända brister (medvetet kvar)

______ (det ni valt att inte laga än, och varför. Ärlighet ger poäng: en omladdning loggar ut – refresh-token är inte byggt; bytes lämnar inte browsern; …)
