# Share Your Music — Cloudflare-native version (eget API, som Polestar 4 Hub)

Samma arkitektur som Polestar 4 Hub: statiska HTML-sidor på Cloudflare Pages,
ett eget REST-API i `functions/` (Pages Functions, körs på Workers-runtime),
JWT-token i `localStorage`, och D1 (Cloudflares SQLite) som databas.

```
public/            → allt som serveras direkt (HTML, CSS, JS, manifest, ikoner)
functions/          → API:et. Filnamn = URL-rutt (Cloudflare Pages Functions-konvention)
schema.sql          → databasschema för D1 (fräscha installationer)
migration_002_email_verification.sql → körs en gång mot en redan uppsatt databas
wrangler.toml       → lokal dev-konfiguration + D1-binding
```

## 1–7: Grundinstallation
Se tidigare instruktioner du redan följt: `wrangler d1 create`, kör `schema.sql`,
skapa Pages-projektet via **Connect to Git**, koppla D1-bindningen, sätt `JWT_SECRET`
som secret, pusha till GitHub, gör dig till admin. Allt det är redan klart hos dig.

## 8. Sätt upp mejl vid registrering (nytt)
Kontot skickar nu ett riktigt bekräftelsemejl vid registrering, med en länk till
`/verify.html?token=...`. Det kräver [Resend](https://resend.com) (gratis upp till
3 000 mejl/månad, ingen kreditkort krävs för att komma igång):

1. Skapa konto på resend.com
2. **API Keys → Create API Key** → kopiera nyckeln
3. I Cloudflare Pages-projektet → **Settings → Variables and secrets → Add variable**:
   - Namn: `RESEND_API_KEY`, värde: din nyckel, markera som **Secret**
   - (Valfritt) Namn: `EMAIL_FROM`, värde: t.ex. `Share Your Music <hello@dindomän.se>`
     — kräver att du verifierat en egen domän hos Resend under **Domains**. Utan detta
     används Resends testadress `onboarding@resend.dev`, som fungerar direkt men
     ser mindre proffsigt ut och har lägre skickgräns.
4. **Retry deployment** så variabeln slår igenom.

Om `RESEND_API_KEY` saknas skickas helt enkelt inget mejl (registrering fungerar
ändå) — bra för lokal utveckling, men glöm inte sätta den i produktion.

## 9. Kör databasmigrationen för befintlig databas
Din databas är redan uppsatt sedan tidigare och saknar de nya kolumnerna för
e-postverifiering. Kör en gång:
```
wrangler d1 execute share-your-music-db --remote --file=./migration_002_email_verification.sql
```

---

## Hur adminpanelen fungerar
- **−  [antal]  +** — justerar en användares poäng med 1 åt gången per klick
- **±n-fältet + Apply** — skriv valfritt tal (t.ex. `-15` eller `50`) för att
  justera med den mängden i ett enda klick, istället för att klicka många gånger
- **Ban/Reinstate** — spärrar eller återaktiverar kontot. Går inte att spärra en
  annan admin (skydd inbyggt i API:et, inte bara gränssnittet)
- Badge (t.ex. "New Reviewer", "Trusted") är samma rykte-nivå som visas överallt
  annars i appen — räknas fram från hur många av personens recensioner som blivit
  betygsatta som hjälpsamma av låtägarna

## Var är kartan?
Fliken heter **Community & Map** i huvudappen (inte Profile — Profile är bara där
du *väljer* land och slår på synlighet). Andra panelen på den fliken, "Where in the
world?", visar en lista grupperad per land med flagga + antal medlemmar + en
liten stapel, för alla som kryssat i "Show me on the map" i sin profil. Ingen exakt
plats visas någonsin, bara land.

## Vad är siffran under signalmätaren på huvudsidan?
Det är dina **credits** (poäng) — valutan i systemet. Du får dem genom att ge
godkänd feedback, och spenderar dem när du lägger upp en egen låt för granskning.
Den lilla badge-texten under (t.ex. "Trusted · 82% helpful · 19 ratings") är en
*annan* siffra — ditt **rykte**, baserat på hur många av dina recensioner som
låtägare markerat som hjälpsamma. De två är kopplade (högt rykte ger bonuspoäng
per given feedback) men mäter olika saker: credits är ditt saldo, rykte är din
trovärdighet.

---

## Säkerhet: hur inloggningen faktiskt fungerar
Kort sammanfattning du kan använda om någon frågar hur säkert det är:

- **Lösenord lagras aldrig i klartext.** De hashas med PBKDF2 (100 000 iterationer,
  SHA-256, unikt slumpat salt per användare) innan de sparas. Även om databasen
  läcker går lösenorden inte att räkna baklänges till klartext på rimlig tid.
- **Inloggning ger en JWT** (signerad token, HMAC-SHA256, egen hemlig nyckel som
  bara servern känner till) som sparas i webbläsarens `localStorage` och skickas
  med varje API-anrop. Token går ut efter 30 dagar.
- **All trafik går över HTTPS** (Cloudflare tvingar detta automatiskt för alla
  `.pages.dev`- och anpassade domäner), så varken lösenord eller token kan
  avlyssnas mellan webbläsare och server.
- **Feedback-sekretessen kontrolleras på servern**, inte bara i gränssnittet —
  ett API-anrop som försöker läsa någon annans feedback nekas med ett `403`-fel,
  oavsett vad klienten skickar.
- **E-postverifiering** (nytt) gör det svårare att registrera med en adress man
  inte äger, men blockerar inte inloggning om man inte verifierat än — det är en
  medveten avvägning för att hålla friktionen låg i det här skedet.

Vad som *inte* är på plats än, om du vill härda vidare: hastighetsbegränsning på
inloggningsförsök (skydd mot brute-force-gissning), lösenordsåterställning via
mejl, och tvåfaktorsinloggning. Inget av det är svårt att lägga till senare, men
det är rimligt att vänta med tills ni har fler användare.
