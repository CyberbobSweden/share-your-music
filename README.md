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

---

## Senaste ändringarna (uppladdning, karta, GUI)

- **Antal lyssningar vid uppladdning** är nu ett fritt sifferfält istället för en
  fast 3/5/8-lista, begränsat av hur många credits du faktiskt har (max 200 som
  absolut tak). Poängen du får för att *ge* feedback är alltid +1 (+1 bonus vid
  Trusted/Expert-rykte) — det är helt separat från hur många lyssningar en
  uppladdad låt begär.
- **"X/Y lyssningar"** på en låt betyder: Y är hur många recensioner ägaren bad
  om (och betalade credits för), X är hur många som kommit in hittills. En
  förklaringsruta ("ⓘ How credits work") finns nu direkt på Lyssna- och
  Upload-flikarna.
- **Kartan är nu en riktig visuell världskarta** (stiliserade kontinentformer +
  prickar per land, storlek baserad på antal medlemmar), inte bara en lista.
  Listan finns kvar under kartan för detaljer.
- Redan på plats sen tidigare, ingen ändring behövdes: man kan inte lyssna på
  sin egen låt (filtreras bort ur kön på servern), och man kan bara recensera
  varje låt en gång (databasens UNIQUE-constraint stoppar det även om någon
  skulle försöka kringgå gränssnittet).
- **Var lagras låtarna?** Ingen ljudfil lagras hos oss någonsin — bara titel,
  genre och länken/embed-ID:t till Spotify/YouTube. Själva uppspelningen sker i
  deras spelare. Det som faktiskt ligger i databasen (D1) är kontouppgifter,
  låt-metadata och skriven feedback — se säkerhetsavsnittet ovan för hur det
  skyddas.

---

## Nytt: mobilanpassning + förslagslåda

- **Mobil**: tabbarna staplas i 2 kolumner på smala skärmar, adminraderna
  (poängjustering/spärra) staplas vertikalt istället för att klämmas ihop,
  och modalrutan för feedback får en maxhöjd med scroll så den aldrig går
  utanför skärmen på en telefon.
- **Förslagslåda**: ny flik **Suggest** i appen där medlemmar kan skicka in
  buggar/idéer (minst 10 tecken). Admin ser alla förslag längst ner på
  adminsidan, sorterade med öppna först, och kan markera dem som granskade.
  Kräver en databasmigration eftersom det är en helt ny tabell:
  ```
  wrangler d1 execute share-your-music-db --remote --file=./migration_003_suggestions.sql
  ```

Version efter den här ändringen: **v1.2.0**.

---

## Nytt: riktig världskarta (v1.3.0)

De handritade "kontinent-blobbarna" är utbytta mot en faktisk karta —
genererad från öppna, allmänna gränsdata (Natural Earth-baserad, via npm-
paketet `world-atlas`, samma typ av källa riktiga kartverktyg bygger på).
Filen ligger som `public/assets/world.svg` (~130 KB, en `<path>` per land,
identifierad med landets ISO 3166-1-nummer).

Länder färgas nu efter hur många medlemmar som valt att synas där — mörkare
guld ju fler, grå/neutral om ingen. Hovra över ett land för en liten tooltip
med namn och antal.

Ingen databasändring krävs för det här — bara push och deploy som vanligt.

---

## v2.0.0 — nytt utseende: "mixtape"

Hela paletten är utbytt. Gamla temat (nästan svart botten + orange/guld) låg
farligt nära två av de vanligaste AI-genererade defaultlooken — inte en
medveten stil, bara ett mönster. Nytt tema är byggt kring själva idén med att
dela musik med varandra: en varm papperston som en kassettbandsficka,
kassettbandsröd + kaklad-teal som accentfärger, och en liten snedställd
"washi tape"-remsa i hörnet på varje kort — som om det klistrats fast för
hand. Rundare hörn rakt igenom, samma typsnitt som innan (Space Grotesk +
IBM Plex Mono höll redan, det var färgerna som var problemet).

Inga variabelnamn i CSS:en ändrades (bara värdena), så inget annat i koden
behövde röras. Ingen databasändring, bara push och deploy.

Version: **v2.0.0**.

---

## v2.1.0 — feedbackhistorik

Ny sektion under **My Tracks**: "Feedback you have given" — en lista över
varje recension du skrivit, med låttitel, genre, datum och om ägaren
markerat den som hjälpsam. Ny endpoint `GET /feedback/mine`. Ingen
databasändring krävs, bara push och deploy.

## Om mejl inte skickas
Om "Resend email" ger fel: kontrollera att testkontot du skickar till har
samma adress som ditt Resend-konto registrerades med — sandboxavsändaren
`onboarding@resend.dev` levererar bara dit. Verifiera en egen domän hos
Resend för att kunna skicka till vem som helst.

---

## v2.2.0 — e-postverifiering avstängd tills vidare

Registrering skickar inte längre något bekräftelsemejl, och appen visar
ingen "verify your email"-banner. Inget blockerar registrering eller
inloggning nu — precis som innan e-postbiten byggdes.

**Allt är kvar i koden, bara avstängt.** Så här slår du på det igen den dag
ni skaffar en egen domän och verifierar den hos Resend:
1. `functions/auth/register.js` → sätt `EMAIL_VERIFICATION_ENABLED = true`
2. `public/app.html` → i `init()`, ta bort kommentarstecknet framför `renderVerifyBanner();`
3. Push och deploy

Ingen databasändring krävs för av- eller påslag.

---

## v2.3.0 — vänlighetspåminnelse, könsprioritet, spelarklarhet

**1) "Be kind, always"** — ny text ovanför feedback-fältet, alltid synlig
(inte gömd bakom en info-knapp): påminnelse om att lyssna igenom hela låten
innan man skriver, och att leverera kritik respektfullt.

**2) Könsordning** — så funkar den: låtar med **färst mottagna recensioner
hittills sorteras överst** (ingen ska behöva vänta för evigt bara för att en
genre är populär), med slumpmässig blandning inom samma nivå. Admin kan nu
**"Feature"** en låt i den nya **Queue**-sektionen på adminsidan — den
låten hoppar då alltid överst i alla köer tills den avmarkeras. Går också
att **Remove** en låt helt (moderation, t.ex. regelbrott).
Kräver en databasmigration:
```
wrangler d1 execute share-your-music-db --remote --file=./migration_004_featured_tracks.sql
```

**3) Spelare utan konto** — texten under spelaren är nu specifik per
plattform: YouTube spelar alltid hela låten utan konto, Spotify kan falla
tillbaka till en 30-sekunders förhandslyssning om man inte är inloggad i
Spotify i samma webbläsare. Går tyvärr inte att upptäcka programmatiskt om
någon är inloggad (cross-origin, ingen åtkomst till Spotifys iframe), så
mer än en tydlig text går inte att göra där.

---

## v2.4.0 — riktiga app-ikoner + illustration

Bilden du skickade (glansig lila 3D-stil) hade krockat rejält med paletten vi
redan valde, så jag ritade en egen ikonuppsättning i "mixtape"-stilen
istället — en kassettbandssilhuett i tape-red/teal/kräm, samma DNA som
resten av sajten.

**Nytt:**
- `public/favicon.ico` + `public/assets/icon-16/32/180/192/512.png` +
  en maskable-variant (`icon-512-maskable.png`) för Android adaptive icons
- `public/assets/hero.png` — illustration på inloggningssidan, syns bredvid
  formuläret på skärmar bredare än ~860px (döljs på mobil för att spara plats)
- `manifest.json` pekar nu på riktiga PNG-ikoner i flera storlekar istället
  för bara en SVG — det var faktiskt en brist innan: iOS stödjer inte
  SVG-ikoner för "Lägg till på hemskärmen", så installation kan ha sett
  trasig ut på iPhone tidigare utan att synas som ett fel.
- Gamla `icon.svg` borttagen (ersatt).

**Installation, testa så här:**
- **Android/Chrome:** adressfältet visar en "installera app"-ikon, eller
  meny → "Lägg till på startskärmen"
- **iPhone/Safari:** dela-ikonen → "Lägg till på hemskärmen"
- **Dator (Chrome/Edge):** ikon i adressfältets högra kant, eller meny →
  "Installera Share Your Music..."

Ingen databasändring. Service worker-cachen är versionsbumpad
(`share-your-music-v2`) så gamla cachade filer rensas automatiskt.
