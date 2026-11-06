// Ståles plan: «Treningsplan – 95 til 85 kg» (5. november 2026).
// Dette er standardinnholdet appen starter med. Alt kan endres under ⚙︎ Innstillinger
// eller ved at Claude-coachen foreslår en ny blokk.

export const MY_PLAN = {
  name: 'Treningsplan – 95 til 85 kg',
  // Styrke på senteret. Bein trenes ikke her – de får nok fra roingen.
  days: [
    {
      id: 'a', name: 'Økt A – bryst, skuldre, triceps',
      exercises: [
        { name: 'Benkpress med stang', sets: 3, reps: '6-10', note: 'Pause 1,5–2 min. Føttene flatt i gulvet, uten stor svai' },
        { name: 'Skrå manualpress', sets: 3, reps: '8-12', note: 'Pause 1,5–2 min' },
        { name: 'Skulderpress med manualer', sets: 3, reps: '8-12', note: 'Sittende med ryggstøtte' },
        { name: 'Sidehev med manualer', sets: 3, reps: '12-15' },
        { name: 'Triceps pushdown i kabel', sets: 3, reps: '10-15' },
      ],
    },
    {
      id: 'b', name: 'Økt B – bryst, rygg, biceps',
      exercises: [
        { name: 'Brystpress i maskin', sets: 3, reps: '8-12', note: 'Pause 1,5–2 min' },
        { name: 'Nedtrekk, bredt grep', sets: 3, reps: '8-12', note: 'Pause 1,5–2 min' },
        { name: 'Sittende roing med brystpute', sets: 3, reps: '10-12' },
        { name: 'Flyes i kabel eller pec deck', sets: 3, reps: '12-15' },
        { name: 'Bicepscurl med manualer', sets: 3, reps: '10-12' },
      ],
    },
    {
      id: 'c', name: 'Økt C – helkropp (når det bare blir én økt)',
      exercises: [
        { name: 'Benkpress med stang', sets: 3, reps: '6-10' },
        { name: 'Skrå manualpress', sets: 3, reps: '8-12' },
        { name: 'Nedtrekk, bredt grep', sets: 3, reps: '8-12' },
        { name: 'Skulderpress med manualer', sets: 3, reps: '8-12', note: 'Sittende med ryggstøtte' },
        { name: 'Bicepscurl med manualer', sets: 3, reps: '10-12', note: 'Supersett med pushdown, uten pause' },
        { name: 'Triceps pushdown i kabel', sets: 3, reps: '10-15', note: 'Supersett med curl, 3 runder' },
      ],
    },
  ],
  // Fast ukeplan. Verdier: id for styrkeøkt ('a', 'b', 'c'), 'row' (roing hjemme) eller 'rest'.
  schedule: {
    Mandag: 'row', Tirsdag: 'a', Onsdag: 'row', Torsdag: 'rest', Fredag: 'b', Lørdag: 'row', Søndag: 'rest',
  },
  rowing: 'Tre roøkter hjemme (man, ons, lør). Rolig = 2:30–2:40/500, 18–22 tak/min, damper 3–5. Maks én hard økt i uka, og først fra uke 5. Harde økter: 10 min rolig oppvarming og 5 min rolig til slutt.',
  // 12 uker i tre faser. Startdato settes under Innstillinger.
  rowProgram: [
    { phase: 'Grunnform', sessions: { Mandag: '15 min rolig', Onsdag: '15 min rolig', Lørdag: '15 min rolig' } },
    { phase: 'Grunnform', sessions: { Mandag: '20 min rolig', Onsdag: '20 min rolig', Lørdag: '20 min rolig' } },
    { phase: 'Grunnform', sessions: { Mandag: '25 min rolig', Onsdag: '25 min rolig', Lørdag: '25 min rolig' } },
    { phase: 'Grunnform', sessions: { Mandag: '30 min rolig', Onsdag: '30 min rolig', Lørdag: '30 min rolig' } },
    { phase: 'Fart', sessions: { Mandag: '30 min rolig', Onsdag: '4 × 4 min på 2:15–2:20, 2 min rolig mellom', Lørdag: '30 min rolig' } },
    { phase: 'Fart', sessions: { Mandag: '35 min rolig', Onsdag: '5 × 4 min på 2:15–2:20, 2 min mellom', Lørdag: '35 min rolig' } },
    { phase: 'Fart', sessions: { Mandag: '35 min rolig', Onsdag: '4 × 5 min på 2:15–2:20, 2 min mellom', Lørdag: '35 min rolig' } },
    { phase: 'Lett uke + test', sessions: { Mandag: '30 min rolig', Onsdag: '2000 m test', Lørdag: '30 min rolig' } },
    { phase: 'Mer fart', sessions: { Mandag: '40 min rolig', Onsdag: '6 × 500 m, 1:30 pause', Lørdag: '40 min rolig' } },
    { phase: 'Mer fart', sessions: { Mandag: '40 min rolig', Onsdag: '3 × 8 min på 2:15, 2 min mellom', Lørdag: '40 min rolig' } },
    { phase: 'Mer fart', sessions: { Mandag: '45 min rolig', Onsdag: '8 × 500 m, 1:30 pause', Lørdag: '45 min rolig' } },
    { phase: 'Lett uke + test', sessions: { Mandag: '30 min rolig', Onsdag: '2000 m test', Lørdag: '30 min rolig + ny Tanita-måling' } },
  ],
  rules: [
    {
      title: 'Spillereglene',
      intro: 'Du starter gjerne for hardt og går tom etter noen uker. Disse reglene er laget for å stoppe akkurat det.',
      items: [
        'Rolig betyr rolig: 2:30–2:40/500 og 18–22 tak i minuttet. Du skal klare å snakke i hele setninger.',
        'Maks én hard økt i uka, og først fra uke 5.',
        'Damper på 3–5. Høyere damper gir mest belastning på korsryggen, ikke mer trening.',
        'Korsryggen: bein, så kropp, så armer. Ikke len deg langt bakover i enden (ca. kl. 11 holder). Ikke nå langt frem med overkroppen.',
        'Fingrene: hold håndtaket løst med fingrene som kroker. Slapp tomlene. Trette fingre = for hardt grep.',
        'Anklene: stopp før leggene er helt loddrette, la hælene løfte seg, og start hver økt med 5 min ekstra rolig.',
        'Smerte som øker under økta, eller er verre dagen etter: kort ned neste økt. Kommer det igjen, spør lege eller fysio.',
        'Bommer du på en økt, hopper du over den. Ikke ta den igjen dagen etter, og ikke doble neste.',
        'Unngå to roøkter på rad de første fire ukene.',
        'Daglig vane: 10 armhevinger hver morgen.',
      ],
    },
    {
      title: 'Styrke på senteret',
      intro: 'Oppvarming: 5 min rolig på sykkel eller romaskin, og 2 lette sett av første øvelse.',
      items: [
        'De to første ukene: velg vekter som føles litt for lette.',
        'Hvert sett skal ende tungt, men med 1–2 repetisjoner igjen i tanken.',
        'Øk vekten når du klarer toppen av intervallet i alle tre settene: +2,5 kg eller neste manual. Start nederst i intervallet igjen.',
        'Pause 1,5–2 min på øvelse 1 og 2, ca. 1 min på resten.',
        'Ryggstøtte på skulderpress og brystpute på roingen skåner korsryggen.',
        'Uke uten senter: 4 sett armhevinger hjemme, 2–3 repetisjoner før du ikke klarer flere.',
      ],
    },
    {
      title: 'Kosthold',
      intro: 'Ca. 2 000–2 200 kcal og minst 160 g protein om dagen. Samme frokost og lunsj hver dag – bare middagen varierer.',
      items: [
        'Drikke uten kalorier: vann, kaffe, te og sukkerfri brus.',
        'Alkohol: hold det til én kveld i uka.',
        'Ett planlagt fritt måltid i uka (f.eks. fredagstaco), i vanlig porsjon. Ingen dårlig samvittighet.',
        'Nødmat i kjøleskapet: kokte egg, grillet kylling, ferdigsalat, proteinrundstykker i fryseren, proteinyoghurt.',
        'Halve tallerkenen grønnsaker til middag. Frosne blandinger er like bra.',
        'Magert pålegg i hverdagen. Brunost og smør legger fort til 150–200 kcal per måltid.',
        'Yoghurt og skyr med minst 8 g protein per 100 g, søtet med søtstoff.',
      ],
    },
    {
      title: 'Oppfølging',
      intro: 'Vei deg én gang i uka på Tanita-vekta, samme dag og tidspunkt: mandag morgen etter toalettet, før frokost.',
      items: [
        'Ned 0,4–0,6 kg i uka → fortsett som før.',
        'Ned mer enn 1 kg i uka → legg til et mellommåltid. For raskt tar muskler.',
        'Står stille i 2 uker → kutt ca. 200 kcal (f.eks. havregrynet og skiva til kvelds).',
        'Muskelmassen faller tydelig → mer protein, og ta styrkeøktene seriøst.',
        'Rygg, fingre eller ankler blir verre → kortere roøkter, og si fra.',
        'Etter uke 12: ny Tanita-måling og 2000 m-test, så lages neste blokk.',
      ],
    },
  ],
};

export const MY_GOALS = {
  text: '95 → 85 kg rundt april 2027, 0,4–0,6 kg i uka, uten å miste muskler. De 10 kiloene skal være fett.',
  targetDate: '2027-04-30',
  weight: 85,
  fat: 18,
  fatMass: 15,
  muscle: 66,
  visceral: 9,
  ratePerWeek: [0.4, 0.6],
};

// Tanita 05.10.2026
export const MY_START_BODY = {
  id: 'tanita-start', date: '2026-10-05', weight: 95, fat: 26.7, fatMass: 25.4, muscle: 66.2, visceral: 11, bmr: 2068, note: 'Tanita – utgangspunkt',
};

const BREAKFAST = { meal: 'Frokost', desc: '300 g skyr/YT proteinyoghurt vanilje + 40 g havregryn + en neve frosne bær', kcal: 430, protein: 33 };
const LUNCH = { meal: 'Lunsj', desc: '2 proteinrundstykker med kyllingpålegg/kokt skinke (ca. 100 g) + 1 kokt egg + agurk/paprika', kcal: 490, protein: 44 };
const SNACK = { meal: 'Mellommåltid', desc: 'Proteinyoghurt eller -pudding (ca. 20 g protein) + 1 frukt', kcal: 250, protein: 20 };
const EVENING = { meal: 'Kveldsmat', desc: '1 beger YT proteinyoghurt vanilje, eller 2 kokte egg', kcal: 180, protein: 18 };
const DINNERS = {
  Mandag: { desc: 'Kyllingwok med frosne wokgrønnsaker og ris – 200 g kylling, 1 dl ris (ukokt)', kcal: 700, protein: 50 },
  Tirsdag: { desc: 'Laks i ovn, poteter, frossen brokkoli – 150–180 g laks, 3 små poteter', kcal: 700, protein: 50 },
  Onsdag: { desc: 'Kjøttsaus av karbonadedeig med fullkornspasta – mye saus, 1 kopp kokt pasta', kcal: 700, protein: 50 },
  Torsdag: { desc: 'Ferdig grillet kylling, ferdigsalat, ris i pose – bryst og lår uten skinn', kcal: 700, protein: 50 },
  Fredag: { desc: 'Fritt måltid, f.eks. taco – vanlig porsjon', kcal: '', protein: '' },
  Lørdag: { desc: 'Burger av karbonadedeig i grovt brød, med salat – 1 burger, ikke 2', kcal: 700, protein: 50 },
  Søndag: { desc: 'Fiskekaker, poteter og gulrøtter – 3–4 fiskekaker, 3 små poteter', kcal: 700, protein: 50 },
};

export const MY_MEAL_PLAN = Object.fromEntries(
  Object.entries(DINNERS).map(([day, d]) => [day, [BREAKFAST, LUNCH, SNACK, { meal: 'Middag', ...d }, EVENING]])
);

export const MY_SHOPPING = [
  {
    title: 'Din faste del per uke',
    items: [
      'Skyr vanilje eller YT proteinyoghurt vanilje, ca. 2 kg',
      'YT proteinyoghurt vanilje til kvelds, 7 beger',
      'Havregryn (til frokost og rundstykker)',
      'Cottage cheese, 2 bokser (dobbel porsjon rundstykker)',
      'Frosne bær',
      'Kyllingpålegg eller kokt skinke, 4–5 pakker',
      'Proteinyoghurt eller -pudding til mellommåltid, 7 stk',
      'Frukt, 7 stk',
      'Egg, 1 brett',
      'Agurk og paprika',
    ],
  },
  {
    title: 'Middager',
    items: [
      'Kyllingfilet', 'Laks', 'Karbonadedeig, 2 pakker', '1 ferdig grillet kylling', 'Fiskekaker',
      'Frosne wokgrønnsaker og brokkoli', 'Ris (også i pose), fullkornspasta, poteter, gulrøtter',
      'Knuste tomater eller tomatsaus', 'Ferdigsalat', 'Grove burgerbrød', 'Taco til fredag',
    ],
  },
];

export const PROTEIN_ROLLS = 'Proteinrundstykker (8–10 stk): 300 g cottage cheese, 250 g havregryn, 2 egg, 1 ss solsikkekjerner, en klype salt og 1 ts bakepulver. Kjør med stavmikser til jevn røre, form rundstykker på bakepapir og stek på 210 °C varmluft i 10–12 min. Ca. 160 kcal og 9 g protein per stk. Lag dobbel porsjon søndag og frys dem.';
