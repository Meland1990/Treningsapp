# Treningsdagbok

En treningsdagbok for mobil og PC: styrke, roing, kroppsmål og mat, med Claude som personlig coach.
Appen starter med planen **«Treningsplan – 95 til 85 kg»** (5.11.2026): økt A/B/C på senteret, tre roøkter hjemme
i et 12-ukers program, spillereglene, Tanita-målene, matplanen med middagsrotasjon og handlelisten.
Appen er en PWA (nettapp som kan legges på hjemskjermen). Den virker uten nett, bortsett fra Claude-coachen.
Alle data lagres lokalt på enheten.

## Funksjoner

**🏋️ Styrke**
- Velg dagens økt fra treningsplanen. Øvelser, sett og reps fylles inn automatisk.
- Før inn kg og reps per sett. Du kan legge til sett, fjerne øvelser og **legge til ekstra øvelser**.
- **Forslag til vekt** (dobbel progresjon): klarer du toppen av rep-intervallet i alle sett, foreslås +2,5 kg (overkropp) eller +5 kg (underkropp). Står du fast i 3 økter, foreslås en lettere periode (deload).
- Historikk som kan redigeres, graf for estimert 1RM og tyngste sett, ukentlig volum og rekorder.

**🚣 Roing (romaskin)**
- Før inn distanse, tid, tak/min, watt, puls, kcal, dragfaktor og intervaller.
- Dagens planlagte økt fra 12-ukersprogrammet vises og fylles inn. 500 m-intervallene får tempo fra siste 2000 m-test + 3 sek.
- Splitt /500 m og watt regnes ut automatisk med Concept2-formelen.
- Rekorder (2k, 5k, 6k, 10k), grafer for splitt/watt/puls/tak per minutt og kilometer per uke.

**📏 Kroppsmål (Tanita)**: vekt, midje, fettprosent, fettmasse, muskelmasse, visceralt fett og BMR, med fremgang mot målene (85 kg, 18 %, 15 kg fett, behold 66 kg muskler, visceralt under 9) og når du når målet i dagens tempo.

**🥗 Mat**
- Matplan per ukedag. Dagens plan kan føres inn i matloggen med ett trykk.
- Matlogg med kcal, protein, karbohydrater og fett, målt mot dine daglige mål.
- Handleliste med avkrysning, og oppskriften på proteinrundstykker.
- Oversikt over de siste 14 dagene.

**🏠 Forsiden**: dagens økt etter ukeplanen (man/ons/lør roing, tir økt A, fre økt B, tor/søn hvile), uke X av 12 i roprogrammet, avkryssing for 10 armhevinger om morgenen, ukeoversikt og «Planen min» med alle reglene.

**💡 Tips etter spillereglene**: advarer når rolige økter går raskere enn 2:30/500, over 22 tak/min eller med damper over 5, ved mer enn én hard økt i uka, harde økter før uke 5, to roøkter på rad i uke 1–4 og plager notert i øktene. Følger også oppfølgingstabellen for vekt (0,4–0,6 kg/uke) og muskelmasse, minner om mandagsveiing, og sier «hopp over» når en økt er bommet.

**🤖 Claude-coach**
- Claude får med treningsplanen og alt du har logget de siste 8 ukene. Du kan be om analyse, nytt program, matplan og rotips, eller stille egne spørsmål.
- Foreslår Claude en ny treningsplan eller matplan, kan du ta den i bruk med knappen **✅ Bruk denne planen**.
- **Importer planen din**: lim inn treningsplanen som tekst, så gjør Claude den om til appens format.
- Uten API-nøkkel kan du trykke **Kopier data** og lime inn i en vanlig Claude-samtale.

## Kom i gang

### 1. Publiser appen med GitHub Pages
1. Gå til repoet på GitHub → **Settings → Pages**.
2. Under *Source* velger du **Deploy from a branch**, så grenen og mappen `/ (root)`.
3. Etter et minutt eller to ligger appen på `https://meland1990.github.io/Treningsapp/`.

GitHub Pages krever at repoet er offentlig, eller at du har GitHub Pro. Treningsdataene dine havner ikke i repoet. De lagres bare på telefonen eller PC-en din.

### 2. Legg appen på hjemskjermen
- **iPhone (Safari)**: Del-knappen → *Legg til på Hjem-skjerm*.
- **Android (Chrome)**: menyen ⋮ → *Installer app* / *Legg til på startskjermen*.

### 3. Sjekk startdatoen
Roprogrammet starter som standard **mandag 9. november 2026**. Endre den under ⚙︎ → Treningsplan → Roprogram.
Der kan du også endre økter, ukeplan og roprogram. Etter uke 12 kan Claude-coachen lage neste blokk (knappen «🗓️ Neste blokk»), som tas i bruk med ett trykk.

### 4. Koble til Claude (valgfritt)
1. Lag en API-nøkkel på [platform.claude.com](https://platform.claude.com) → *API Keys*. Bruken betales per forespørsel, så sett gjerne en månedlig utgiftsgrense.
2. Lim nøkkelen inn under ⚙︎ → **Claude-kobling**.

Nøkkelen lagres bare i nettleseren på enheten din og sendes kun til Anthropic.

## Sikkerhetskopi og flere enheter
Dataene ligger i nettleseren (localStorage). Bruk ⚙︎ → **Last ned sikkerhetskopi** jevnlig.
Med samme fil kan du flytte data mellom enheter (**Gjenopprett fra fil**).

## Kjør lokalt
```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

## Filer
| Fil | Innhold |
|---|---|
| `index.html` | Skall, navigasjon |
| `app.js` | Visninger og hendelser |
| `myplan.js` | Planen din: økter, ukeplan, roprogram, regler, mål, matplan og handleliste |
| `data.js` | Lagring, eksempelplan, beregninger (1RM, splitt, watt), tips og datasammendrag til Claude |
| `charts.js` | SVG-grafer uten eksterne biblioteker |
| `coach.js` | Kobling til Claude (Anthropic SDK) |
| `sw.js`, `manifest.webmanifest` | Offline-støtte og installasjon som app |
