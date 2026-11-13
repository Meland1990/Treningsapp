# Treningsappen – slik oppdaterer du planen

Ståle bruker Claude som personlig trener i en egen chat. Når dere blir enige om
endringer i treningsplanen, matplanen, handlelista eller målene, skal appen
oppdateres i samme slengen. Appen ligger på https://meland1990.github.io/Treningsapp/.

## Fremgangsmåte
1. Endre bare det dere ble enige om i `myplan.js` (`MY_PLAN`, `MY_MEAL_PLAN`,
   `MY_SHOPPING`, `MY_GOALS`). Behold formatet som står der.
2. Oppdater `PLAN_UPDATE` øverst i `myplan.js`:
   - `revision`: øk med 1. Uten dette henter ikke telefonen den nye planen.
   - `date`: dagens dato (ÅÅÅÅ-MM-DD).
   - `note`: 1–3 setninger på norsk om hva som er endret. Ståle ser denne teksten i appen.
   - `parts`: bare delene som er endret: `'plan'`, `'mealPlan'`, `'shopping'`, `'goals'`.
   - `settings`: bare hvis kcal-mål, proteinmål eller startdato for roprogrammet endres,
     f.eks. `{ kcalTarget: 2000, proteinTarget: 170 }`. Ellers `{}`.
3. Sjekk at fila er gyldig: `node --input-type=module -e "import('./myplan.js').then(m => console.log(m.PLAN_UPDATE))"`
4. Commit på standardgrenen (`claude/workout-diary-app-9tjtv3`, den GitHub Pages publiserer fra) med en norsk melding som sier hva som er endret, og push.
   GitHub Pages publiserer etter et par minutter.
5. Si kort til Ståle hva som er endret i appen.

## Hva skjer på telefonen
Neste gang appen åpnes med nett, ser den at `revision` er høyere enn den lagrede,
bytter ut delene i `parts`, og viser `note` med en Angre-knapp. Loggede økter,
roøkter, kroppsmål og matlogg røres aldri. De tre siste planene lagres som
sikkerhetskopi på telefonen.

## Ikke gjør
- Ikke endre `MY_START_BODY` (startmålingen) eller logikken i `data.js`/`app.js`
  for en planendring.
- Ikke glem å øke `revision`.
