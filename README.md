# Share Your Music — Cloudflare-native version (eget API, som Polestar 4 Hub)

Samma arkitektur som Polestar 4 Hub: statiska HTML-sidor på Cloudflare Pages,
ett eget REST-API i `functions/` (Pages Functions, körs på Workers-runtime),
JWT-token i `localStorage`, och D1 (Cloudflares SQLite) som databas. Ingen
Supabase, inget npm-beroende, inget byggsteg.

```
public/            → allt som serveras direkt (HTML, CSS, JS, manifest, ikoner)
functions/          → API:et. Filnamn = URL-rutt (Cloudflare Pages Functions-konvention)
schema.sql          → databasschema för D1
wrangler.toml       → lokal dev-konfiguration + D1-binding
```

## 1. Installera Wrangler (Cloudflares CLI)
```
npm install -g wrangler
wrangler login
```

## 2. Skapa D1-databasen
```
wrangler d1 create share-your-music-db
```
Kommandot skriver ut ett `database_id`. Klistra in det i `wrangler.toml` där det står
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## 3. Kör schemat mot databasen
```
wrangler d1 execute share-your-music-db --remote --file=./schema.sql
```

## 4. Skapa Pages-projektet och koppla D1
Enklast via dashboard:
1. dash.cloudflare.com → Workers & Pages → Create → Pages → **Connect to Git**
   (pusha den här mappen till ett GitHub-repo först, se steg 6).
2. Projektnamn: **share-your-music** (blir din `share-your-music.pages.dev`-adress).
3. Build settings: inget byggkommando, **Build output directory = `public`**.
4. Efter första deployen: Settings → Functions → **D1 database bindings** →
   Add binding → variable name `DB` → välj `share-your-music-db`.

## 5. Sätt JWT-hemligheten
Settings → Environment variables → **Add variable** → namn `JWT_SECRET`,
värde: en lång slumpad sträng (t.ex. kör `openssl rand -hex 32` lokalt och klistra in
resultatet). Markera den som **Secret**, inte plain text. Klicka **Encrypt**.

Utan detta steg går inte inloggning att verifiera — appen kraschar med 500-fel.

## 6. Pusha koden till GitHub
```
git init
git add .
git commit -m "Share Your Music — Cloudflare-native version"
git branch -M main
git remote add origin https://github.com/DITT-NAMN/share-your-music.git
git push -u origin main
```
Cloudflare Pages deployar om automatiskt vid varje push när git-kopplingen finns.

## 7. Gör dig själv till admin
1. Registrera ett konto i din driftsatta app (din `share-your-music.pages.dev`-adress,
   eller din egen domän om du kopplat en sådan).
2. ```
   wrangler d1 execute share-your-music-db --remote --command "UPDATE users SET is_admin = 1 WHERE email = 'din@mejl.se';"
   ```
3. Logga ut och in igen — Admin-länken dyker upp högst upp i appen.

---

## Vad som skiljer den här versionen från Supabase-versionen
- **Eget API**, inte databasfunktioner — all affärslogik (poängavdrag, validering,
  betygslogik) ligger i `functions/*.js`, körs på Cloudflares edge-nätverk.
- **JWT i `localStorage`**, samma mönster som Polestar 4 Hub (`setAuth`/`apiFetch`),
  inte Supabase Auth-sessioner.
- **Lösenord hashas med PBKDF2** via Web Crypto — inga externa beroenden.
- **Feedback-sekretess upprätthålls i API-koden**: `GET /tracks/:id/feedback`
  returnerar `403` om anroparen varken äger låten eller är admin — samma skydd
  som RLS gav i Supabase-versionen, fast skrivet för hand.
- **PWA-stöd**: `manifest.json` + `sw.js` + `offline.html`, precis som Polestar 4 Hub.
  Service workern cachar aldrig API-anrop — bara statiska sidor/tillgångar — så du
  ser alltid färsk data när nätet finns, och ett tydligt offline-läge när det inte gör det.

## Lokal utveckling
```
wrangler pages dev public --d1=DB=share-your-music-db --binding JWT_SECRET=dev-secret
```
Kör lokalt mot en lokal kopia av D1 (Wrangler skapar den automatiskt första gången).
