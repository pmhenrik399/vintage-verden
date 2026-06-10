# Vintage Verden

Statisk nettside med alle aktive FINN-annonser (2 280 produkter) for Ragne Gigernes.
Alle kjøp skjer via den originale FINN-annonsen — siden lenker dit.

## Innhold
- `index.html` + `assets/` — selve nettsiden (ren statisk HTML/CSS/JS, ingen avhengigheter)
- `data/products.json` — produktdatabasen (generert fra FINN-annonsene)
- `tools/` — verktøy for å oppdatere data (trengs ikke på serveren)

## Publisering
Hele mappen kan publiseres som den er på en hvilken som helst statisk host:

**Netlify (enklest):** Gå til https://app.netlify.com/drop og dra hele `vintage-verden`-mappen inn i vinduet. Ferdig.

**Vercel:** `npx vercel --prod` i denne mappen.

**GitHub Pages:** Push mappen til et repo, aktiver Pages på main-branchen.

## Oppdatere produktene senere
1. Logg inn på FINN i Chrome og be Claude kjøre samme innhøsting på nytt
   (scriptet henter alle aktive annonser via `my-items`-API-et og laster ned `vintage-verden-ads.json`)
2. Kjør: `node tools/build-data.mjs <sti-til-nedlastet-json>`
3. Last opp `data/products.json` på nytt

## Merk
- Produktbildene lastes direkte fra FINN sitt CDN (`images.finncdn.no`). De fungerer så
  lenge annonsen finnes på FINN. Når en annonse slettes/utløper kan bildet forsvinne —
  kjør en ny innhøsting for å holde siden i synk.
- Vurderings-tallene (9,9 · 1 088) er hardkodet i `index.html` — oppdater dem der ved behov.
