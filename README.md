# Treningsdagbok

En treningsdagbok for mobil og PC: styrke, roing, kroppsmål og mat, med Claude som personlig coach.
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
- Splitt /500 m og watt regnes ut automatisk med Concept2-formelen.
- Rekorder (2k, 5k, 6k, 10k), grafer for splitt/watt/puls/tak per minutt og kilometer per uke.

**📏 Kroppsmål**: vekt, midje, hofte, bryst, overarm, lår og fettprosent, med grafer over utviklingen.

**🥗 Mat**
- Matplan per ukedag. Dagens plan kan føres inn i matloggen med ett trykk.
- Matlogg med kcal, protein, karbohydrater og fett, målt mot dine daglige mål.
- Oversikt over de siste 14 dagene.

**💡 Tips**: regelbaserte tips på forsiden om fremgang, stagnasjon, midjetrend, fordeling mellom rolig og hard roing, og protein.

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

### 3. Legg inn treningsplanen din
- ⚙︎ → **Treningsplan**: én øvelse per linje, `Øvelse | sett | reps | notat`, for eksempel `Knebøy | 4 | 6-8 | 2 min pause`.
- Du kan også lime planen inn under **Coach → Importer treningsplanen min fra tekst**.

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
| `data.js` | Lagring, eksempelplan, beregninger (1RM, splitt, watt), tips og datasammendrag til Claude |
| `charts.js` | SVG-grafer uten eksterne biblioteker |
| `coach.js` | Kobling til Claude (Anthropic SDK) |
| `sw.js`, `manifest.webmanifest` | Offline-støtte og installasjon som app |
