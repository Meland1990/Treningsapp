// Lagring, standarddata og beregninger. Alt lagres lokalt på enheten (localStorage).
import { MY_PLAN, MY_GOALS, MY_START_BODY, MY_MEAL_PLAN, MY_SHOPPING } from './myplan.js';

const KEY = 'treningsdagbok_v1';

export const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
export const MEALS = ['Frokost', 'Lunsj', 'Mellommåltid', 'Middag', 'Kveldsmat'];
export const ROW_TYPES = ['Rolig', 'Intervall', 'Test 2000 m', 'Test 5000 m', 'Annet'];
export const EASY_SPLIT = [150, 160]; // 2:30–2:40 per 500 m
export const EASY_SPM = [18, 22];

export const DEFAULT_PLAN = MY_PLAN;

const DEFAULT_STATE = {
  version: 2,
  settings: {
    name: 'Ståle',
    goal: MY_GOALS.text,
    heightCm: '',
    kcalTarget: 2100,
    proteinTarget: 160,
    rowStartDate: '2026-11-09',
    apiKey: '',
    model: 'claude-opus-5-5',
    effort: 'medium',
  },
  goals: MY_GOALS,
  plan: MY_PLAN,
  workouts: [],   // { id, date, dayId, dayName, exercises:[{name, target, extra, sets:[{w, r}]}], note, rpe, durationMin }
  rows: [],       // { id, date, type, distance, timeSec, spm, watt, hr, kcal, damper, drag, week, planned, note }
  body: [MY_START_BODY], // { id, date, weight, waist, fat, fatMass, muscle, visceral, bmr, hip, chest, arm, note }
  mealPlan: MY_MEAL_PLAN, // { Mandag: [{ meal, desc, kcal, protein }] }
  food: [],       // { id, date, meal, desc, kcal, protein, carbs, fat }
  shopping: MY_SHOPPING,
  shoppingChecked: [],
  habits: { pushups: [] }, // datoer med 10 armhevinger
  coach: { messages: [], snapshot: '', startedAt: null },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = migrate(JSON.parse(raw));
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      coach: { ...DEFAULT_STATE.coach, ...(parsed.coach || {}) },
    };
  } catch (e) {
    console.error('Kunne ikke lese lagrede data', e);
    return structuredClone(DEFAULT_STATE);
  }
}

// Oppgraderer data fra den første versjonen (eksempelplan) til Ståles plan.
function migrate(d) {
  if ((d.version || 1) < 2) {
    if (!d.plan || /^Eksempelplan/.test(d.plan.name || '')) d.plan = structuredClone(MY_PLAN);
    if (!d.mealPlan || !Object.values(d.mealPlan).some((v) => v.length)) d.mealPlan = structuredClone(MY_MEAL_PLAN);
    d.body = d.body || [];
    if (!d.body.some((b) => b.id === MY_START_BODY.id)) d.body.push(structuredClone(MY_START_BODY));
    d.settings = d.settings || {};
    if (!d.settings.kcalTarget || d.settings.kcalTarget === 2400) d.settings.kcalTarget = 2100;
    if (!d.settings.goal) d.settings.goal = MY_GOALS.text;
    d.version = 2;
  }
  return d;
}

export function getState() { return state; }

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error(e);
    alert('Klarte ikke å lagre (lagringsplass full eller blokkert). Ta en sikkerhetskopi under Innstillinger.');
    return false;
  }
}

export function replaceState(newState) {
  newState = migrate(newState);
  state = { ...structuredClone(DEFAULT_STATE), ...newState, settings: { ...DEFAULT_STATE.settings, ...(newState.settings || {}) } };
  save();
}

export function resetAll() {
  state = structuredClone(DEFAULT_STATE);
  save();
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- Dato og tid ----------
export function today() {
  const d = new Date();
  return toISODate(d);
}
export function toISODate(d) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function daysAgo(iso) {
  const d = new Date(iso + 'T12:00:00');
  const n = new Date(today() + 'T12:00:00');
  return Math.round((n - d) / 86400000);
}
export function weekdayName(iso) {
  const d = new Date(iso + 'T12:00:00');
  return WEEKDAYS[(d.getDay() + 6) % 7];
}
export function isoWeek(iso) {
  const d = new Date(iso + 'T12:00:00');
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-U${String(Math.ceil(((t - yearStart) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}

// "7:32.5", "32:10", "1:02:03" eller sekunder → sekunder
export function parseTime(str) {
  if (str == null) return NaN;
  const s = String(str).trim().replace(',', '.');
  if (!s) return NaN;
  const parts = s.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
export function fmtTime(sec, decimals = 0) {
  if (!isFinite(sec)) return '–';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = decimals ? s.toFixed(decimals).padStart(3 + decimals, '0') : String(Math.round(s)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ---------- Roing ----------
export function splitPer500(row) {
  if (!row.distance || !row.timeSec) return NaN;
  return row.timeSec / (row.distance / 500);
}
// Concept2-formel: watt = 2.80 / (sek per meter)^3
export function wattFromSplit(split500) {
  if (!isFinite(split500) || split500 <= 0) return NaN;
  return 2.8 / Math.pow(split500 / 500, 3);
}
export function rowWatt(row) {
  return row.watt ? Number(row.watt) : wattFromSplit(splitPer500(row));
}

export const isEasy = (r) => /rolig|UT/i.test(r.type || '');
export const isHard = (r) => /intervall|test|terskel/i.test(r.type || '');

// Hvilken uke i 12-ukersprogrammet en dato hører til (1–12), eller null.
export function rowWeek(iso) {
  const start = state.settings.rowStartDate;
  if (!start) return null;
  const d = Math.floor((new Date(iso + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000);
  if (d < 0) return null;
  const w = Math.floor(d / 7) + 1;
  return w <= (state.plan.rowProgram?.length || 0) ? w : null;
}

export function sessionKind(desc) {
  if (/test/i.test(desc)) return /5000/.test(desc) ? 'Test 5000 m' : 'Test 2000 m';
  if (/\d\s*[×x]\s*\d/.test(desc)) return 'Intervall';
  return 'Rolig';
}

// Siste 2000 m-test (for å regne ut tempoet på 500 m-intervallene)
export function last2kTest() {
  return [...state.rows].filter((r) => Number(r.distance) === 2000 && /test/i.test(r.type)).sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Planlagt roøkt for en dato: { week, phase, desc, kind, target } eller null
export function rowSessionFor(iso) {
  const week = rowWeek(iso);
  if (!week) return null;
  const wk = state.plan.rowProgram[week - 1];
  const desc = wk?.sessions?.[weekdayName(iso)];
  if (!desc) return null;
  const kind = sessionKind(desc);
  let target;
  if (kind === 'Rolig') target = 'Rolig: 2:30–2:40/500, 18–22 tak/min, damper 3–5. Start med 5 min ekstra rolig.';
  else if (kind === 'Intervall') {
    target = '10 min rolig oppvarming, 5 min rolig til slutt. Alle drag i samme tempo.';
    if (/500 m/.test(desc)) {
      const t = last2kTest();
      target += t ? ` Tempo: ${fmtTime(splitPer500(t) + 3, 1)}/500 (2000 m-testen + 3 sek).` : ' Tempo: 2000 m-testens snittsplitt + 3 sek.';
    }
  } else target = 'Den eneste økta der du skal ta i. Start rolig de første 500 m og øk deretter.';
  return { week, phase: wk.phase, desc, kind, target };
}

// Planlagt aktivitet for en dato etter ukeplanen
export function scheduleFor(iso) {
  return state.plan.schedule?.[weekdayName(iso)] || 'rest';
}

// ---------- Styrke ----------
export function parseRepRange(reps) {
  const m = String(reps || '').match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  const n = parseInt(reps, 10);
  return isNaN(n) ? null : { lo: n, hi: n };
}
export const e1rm = (w, r) => (w > 0 && r > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);

export function exerciseHistory(name) {
  const key = name.trim().toLowerCase();
  const out = [];
  for (const w of [...state.workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === key);
    if (!ex) continue;
    const sets = ex.sets.filter((s) => s.r > 0);
    if (!sets.length) continue;
    const best = Math.max(...sets.map((s) => e1rm(Number(s.w) || 0, Number(s.r))));
    const top = Math.max(...sets.map((s) => Number(s.w) || 0));
    const volume = sets.reduce((a, s) => a + (Number(s.w) || 0) * Number(s.r), 0);
    out.push({ date: w.date, sets, best, top, volume, target: ex.target });
  }
  return out;
}

export function allExerciseNames() {
  const set = new Set();
  state.plan.days.forEach((d) => d.exercises.forEach((e) => set.add(e.name)));
  state.workouts.forEach((w) => w.exercises.forEach((e) => set.add(e.name)));
  return [...set].sort((a, b) => a.localeCompare(b, 'no'));
}

const DUMBBELL = /(manual|hantel)/i;

// Dobbel progresjon (fra planen): klarer du toppen av intervallet i alle settene,
// øk med 2,5 kg eller neste manual, og start nederst i intervallet igjen.
export function suggestNext(name, repsTarget) {
  const hist = exerciseHistory(name);
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const range = parseRepRange(repsTarget || last.target);
  const topW = last.top;
  if (!range || !topW) return { weight: topW || '', text: `Sist: ${describeSets(last.sets)}` };
  const workSets = last.sets.filter((s) => Number(s.w) === topW);
  const step = 2.5;
  if (workSets.every((s) => s.r >= range.hi)) {
    const how = DUMBBELL.test(name) ? 'neste manual' : `${fmtNum(topW + step)} kg`;
    return { weight: topW + step, text: `Alle sett på ${range.hi}+ reps sist – gå opp til ${how} og start på ${range.lo} reps igjen.` };
  }
  if (workSets.some((s) => s.r < range.lo)) {
    // Sjekk om det har stått stille i 3 økter
    const recent = hist.slice(-3);
    if (recent.length === 3 && recent.every((h) => h.top === topW && h.sets.some((s) => s.r < range.lo))) {
      const lower = Math.round((topW * 0.9) / 2.5) * 2.5;
      return { weight: lower, text: `Stått fast på ${fmtNum(topW)} kg i 3 økter – ta ned til ${fmtNum(lower)} kg og bygg opp igjen.` };
    }
    return { weight: topW, text: `Under ${range.lo} reps sist – bli på ${fmtNum(topW)} kg til du klarer intervallet.` };
  }
  return { weight: topW, text: `Bli på ${fmtNum(topW)} kg og prøv å legge på 1 rep per sett (sist: ${describeSets(last.sets)}).` };
}

export function describeSets(sets) {
  return sets.map((s) => (s.w ? `${fmtNum(s.w)}×${s.r}` : `${s.r}`)).join(', ');
}

export const fmtNum = (n, d = 1) => {
  if (n === '' || n == null || !isFinite(n)) return '–';
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(d).replace('.', ',');
};

// ---------- Mat ----------
export function foodTotals(date) {
  const items = state.food.filter((f) => f.date === date);
  const sum = (k) => items.reduce((a, f) => a + (Number(f[k]) || 0), 0);
  return { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), count: items.length };
}

// ---------- Kropp ----------
// Ukentlig vektendring basert på målinger de siste ~3 ukene
export function weightRate() {
  const W = state.body.filter((b) => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  if (W.length < 2) return null;
  const last = W[W.length - 1];
  const ref = [...W].reverse().find((b) => daysAgo(b.date) - daysAgo(last.date) >= 13) || W[0];
  const weeks = (daysAgo(ref.date) - daysAgo(last.date)) / 7;
  if (weeks < 0.9) return null;
  return { perWeek: (last.weight - ref.weight) / weeks, weeks, from: ref, to: last };
}

// ---------- Tips (regelbasert, fungerer uten Claude) ----------
export function generateTips() {
  const tips = [];
  const s = state;
  const t = today();
  const week = rowWeek(t);
  const sortedR = [...s.rows].sort((a, b) => b.date.localeCompare(a.date));

  // --- Roing: spillereglene ---
  const recentEasy = sortedR.filter((r) => isEasy(r) && daysAgo(r.date) < 14);
  const tooFast = recentEasy.filter((r) => splitPer500(r) < EASY_SPLIT[0] - 0.5);
  if (tooFast.length) {
    tips.push({ kind: 'warn', text: `${tooFast.length} av de siste rolige roøktene gikk raskere enn 2:30/500 (sist ${fmtTime(splitPer500(tooFast[0]), 1)}). Rolig betyr rolig – du skal kunne snakke i hele setninger. Det er dette som hindrer at du går tom.` });
  } else if (recentEasy.length >= 3) {
    tips.push({ kind: 'good', text: `Rolige økter holdes i riktig tempo (2:30–2:40/500). Det er nettopp dette som bygger grunnformen. 👍` });
  }
  const highSpm = recentEasy.filter((r) => r.spm && r.spm > EASY_SPM[1]);
  if (highSpm.length) tips.push({ kind: 'warn', text: `Tak/min over 22 på ${highSpm.length} rolige økt(er). Senk takfrekvensen til 18–22 og ta lengre, rolige tak.` });
  const highDamper = sortedR.filter((r) => daysAgo(r.date) < 14 && r.damper > 5);
  if (highDamper.length) tips.push({ kind: 'warn', text: 'Damper over 5 er logget. Hold damper på 3–5 – høyere gir mest belastning på korsryggen, ikke mer trening.' });

  const thisWeekHard = s.rows.filter((r) => isHard(r) && isoWeek(r.date) === isoWeek(t));
  if (thisWeekHard.length > 1) tips.push({ kind: 'warn', text: `${thisWeekHard.length} harde roøkter denne uka. Regelen er maks én hard økt i uka.` });
  const hardEarly = s.rows.filter((r) => isHard(r) && rowWeek(r.date) && rowWeek(r.date) < 5);
  if (hardEarly.length) tips.push({ kind: 'warn', text: 'Hard roøkt logget før uke 5. De fire første ukene skal være bare rolig – grunnformen først.' });

  // To roøkter på rad i de første fire ukene
  const dates = [...new Set(s.rows.map((r) => r.date))].sort();
  for (let i = 1; i < dates.length; i++) {
    const w = rowWeek(dates[i]);
    if (w && w <= 4 && daysAgo(dates[i - 1]) - daysAgo(dates[i]) === 1 && daysAgo(dates[i]) < 7) {
      tips.push({ kind: 'warn', text: 'To roøkter på rad denne uka. De første fire ukene skal det være minst én dag mellom, for rygg, fingre og ankler.' });
      break;
    }
  }
  const painNotes = sortedR.concat(s.workouts).filter((x) => daysAgo(x.date) < 10 && /(vondt|smert|stiv|verk|rygg|finger|fingre|ankel|ankl)/i.test(x.note || ''));
  if (painNotes.length) tips.push({ kind: 'warn', text: `Du har notert plager i ${painNotes.length} økt(er) nylig. Smerte som øker under økta eller er verre dagen etter: kort ned neste økt. Kommer det igjen, spør lege eller fysio.` });

  // Bommet økt: hopp over
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  const plannedY = scheduleFor(yesterday);
  const doneY = plannedY === 'row' ? s.rows.some((r) => r.date === yesterday || r.date === t)
    : plannedY !== 'rest' ? s.workouts.some((w) => w.date === yesterday || w.date === t) : true;
  if (!doneY && (s.rows.length || s.workouts.length)) tips.push({ kind: '', text: 'Bommet du på gårsdagens økt? Hopp over den – ikke ta den igjen i dag, og ikke doble neste. Følg bare planen videre.' });

  if (week && week <= 2 && s.workouts.length) tips.push({ kind: '', text: `Uke ${week}: velg vekter på senteret som føles litt for lette. Det er her du pleier å starte for hardt.` });
  if (week === 8 || week === 12) tips.push({ kind: '', text: `Uke ${week} er lett uke med 2000 m-test på onsdag. Start rolig de første 500 m og øk deretter.` });

  // --- Styrke ---
  const thisWeekStrength = s.workouts.filter((w) => isoWeek(w.date) === isoWeek(t)).length;
  const wd = weekdayName(t);
  if ((wd === 'Lørdag' || wd === 'Søndag') && thisWeekStrength === 0 && (s.workouts.length || s.rows.length)) {
    tips.push({ kind: '', text: 'Ingen senterøkt denne uka? Ta 4 sett armhevinger hjemme, 2–3 reps før du ikke klarer flere. Det holder brystet i gang.' });
  } else if (wd === 'Fredag' && thisWeekStrength === 0 && s.workouts.length) {
    tips.push({ kind: '', text: 'Blir det bare én senterøkt denne uka, ta økt C.' });
  }
  const names = new Set(s.plan.days.flatMap((d) => d.exercises.map((e) => e.name)));
  for (const n of names) {
    const h = exerciseHistory(n);
    if (h.length >= 4) {
      const first = h[h.length - 4].best, last = h[h.length - 1].best;
      const pct = ((last - first) / first) * 100;
      if (pct >= 5) tips.push({ kind: 'good', text: `${n}: estimert 1RM opp ${fmtNum(pct)} % over de siste 4 øktene. 💪` });
      else if (Math.abs(pct) < 1.5) tips.push({ kind: 'warn', text: `${n}: lite fremgang siste 4 økter. Sjekk at settene ender tungt (1–2 reps igjen i tanken), og at du får nok protein og søvn.` });
    }
  }

  // --- Kropp: oppfølgingstabellen ---
  const rate = weightRate();
  if (rate) {
    const loss = -rate.perWeek;
    if (loss > 1) tips.push({ kind: 'warn', text: `Ned ${fmtNum(loss)} kg/uke – det er for raskt og tar muskler. Legg til et mellommåltid.` });
    else if (loss >= 0.4) tips.push({ kind: 'good', text: `Ned ${fmtNum(loss)} kg/uke – akkurat i målsonen (0,4–0,6). Fortsett som før.` });
    else if (Math.abs(rate.perWeek) < 0.15 && rate.weeks >= 2) tips.push({ kind: 'warn', text: 'Vekten har stått stille i 2 uker. Kutt ca. 200 kcal, f.eks. havregrynet og skiva til kvelds.' });
    else if (loss > 0) tips.push({ kind: '', text: `Ned ${fmtNum(loss)} kg/uke – litt under målet (0,4–0,6). Sjekk drikke, helg og porsjonen til middag.` });
  }
  const M = s.body.filter((b) => b.muscle).sort((a, b) => a.date.localeCompare(b.date));
  if (M.length >= 2 && M[M.length - 1].muscle < M[M.length - 2].muscle - 0.7) {
    tips.push({ kind: 'warn', text: `Muskelmassen falt ${fmtNum(M[M.length - 2].muscle - M[M.length - 1].muscle)} kg siden forrige måling. Mer protein, og ta styrkeøktene seriøst.` });
  }
  const lastW = [...s.body].filter((b) => b.weight).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastW || daysAgo(lastW.date) >= 7) tips.push({ kind: '', text: `Tid for ukens Tanita-veiing${wd === 'Mandag' ? ' i dag' : ''}: mandag morgen etter toalettet, før frokost.` });

  // --- Mat ---
  const days = [...new Set(s.food.filter((f) => daysAgo(f.date) < 7).map((f) => f.date))];
  if (days.length >= 3 && s.settings.proteinTarget) {
    const avgP = days.reduce((a, d) => a + foodTotals(d).protein, 0) / days.length;
    if (avgP < s.settings.proteinTarget * 0.9) tips.push({ kind: 'warn', text: `Snitt protein siste uke: ${Math.round(avgP)} g/dag (mål ${s.settings.proteinTarget} g). Ha nødmaten klar: kokte egg, proteinyoghurt, proteinrundstykker i fryseren.` });
    else tips.push({ kind: 'good', text: `Proteinmålet nås: snitt ${Math.round(avgP)} g/dag siste uke.` });
  }

  // --- Vane ---
  const pu = s.habits?.pushups || [];
  if (!pu.includes(t) && new Date().getHours() < 12) tips.push({ kind: '', text: 'Morgenvanen: 10 armhevinger. Huk av på forsiden når de er tatt.' });

  if (!tips.length) tips.push({ kind: 'good', text: 'Alt ser bra ut. Følg planen og logg øktene – da kan Claude justere ut fra tallene dine.' });
  return tips;
}

// ---------- Sammendrag for Claude ----------
export function buildSnapshot({ weeks = 8 } = {}) {
  const s = state;
  const cutoff = (iso) => daysAgo(iso) <= weeks * 7;
  const lines = [];
  lines.push(`# Treningsdagbok – data per ${today()} (${weekdayName(today())})`);
  const st = s.settings;
  const g = s.goals || {};
  lines.push(`Navn: ${st.name || '-'} | Høyde: ${st.heightCm || '-'} cm`);
  lines.push(`Mål: ${st.goal || '-'}`);
  if (g.weight) lines.push(`Målverdier: vekt ${g.weight} kg, fett ${g.fat} %, fettmasse ${g.fatMass} kg, muskelmasse beholdes på ${g.muscle} kg, visceralt fett under ${g.visceral}, innen ${g.targetDate}`);
  lines.push(`Ernæringsmål: ${st.kcalTarget || '-'} kcal, ${st.proteinTarget || '-'} g protein per dag`);

  lines.push(`\n## Nåværende plan: ${s.plan.name}`);
  if (s.plan.schedule) lines.push('Ukeplan: ' + WEEKDAYS.map((d) => {
    const v = s.plan.schedule[d];
    return `${d} ${v === 'row' ? 'roing hjemme' : v === 'rest' ? 'hvile' : (s.plan.days.find((x) => x.id === v)?.name || v)}`;
  }).join(', '));
  s.plan.days.forEach((d) => {
    lines.push(`- ${d.name}: ` + d.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.note ? ` (${e.note})` : ''}`).join('; '));
  });
  if (s.plan.rowing) lines.push(`- Roing: ${s.plan.rowing}`);
  if (s.plan.rowProgram?.length) {
    const w = rowWeek(today());
    lines.push(`Roprogram (${s.plan.rowProgram.length} uker, start ${st.rowStartDate || 'ikke satt'}; nå uke ${w ?? (st.rowStartDate && today() < st.rowStartDate ? 'før start' : 'utenfor programmet')}):`);
    s.plan.rowProgram.forEach((wk, i) => lines.push(`  Uke ${i + 1} ${wk.phase}: ` + Object.entries(wk.sessions).map(([d, x]) => `${d} ${x}`).join('; ')));
  }
  (s.plan.rules || []).forEach((r) => {
    lines.push(`\n### ${r.title}`);
    if (r.intro) lines.push(r.intro);
    r.items.forEach((x) => lines.push(`- ${x}`));
  });

  const W = s.workouts.filter((w) => cutoff(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  lines.push(`\n## Styrkeøkter siste ${weeks} uker (${W.length} stk). Format: øvelse: kg×reps per sett`);
  W.forEach((w) => {
    lines.push(`${w.date} ${w.dayName || ''}${w.rpe ? ` RPE ${w.rpe}` : ''}${w.durationMin ? ` ${w.durationMin} min` : ''}${w.note ? ` – "${w.note}"` : ''}`);
    w.exercises.forEach((e) => {
      if (!e.sets.some((x) => x.r > 0)) return;
      lines.push(`  ${e.name}${e.extra ? ' [ekstra]' : ''}: ${describeSets(e.sets.filter((x) => x.r > 0))}`);
    });
  });

  const R = s.rows.filter((r) => cutoff(r.date)).sort((a, b) => a.date.localeCompare(b.date));
  lines.push(`\n## Roøkter siste ${weeks} uker (${R.length} stk)`);
  R.forEach((r) => {
    const sp = splitPer500(r);
    lines.push(`${r.date}${r.week ? ` (uke ${r.week})` : ''} ${r.type}: ${r.distance} m på ${fmtTime(r.timeSec)}, splitt ${fmtTime(sp, 1)}/500m, ${Math.round(rowWatt(r)) || '-'} W` +
      `${r.spm ? `, ${r.spm} tak/min` : ''}${r.damper ? `, damper ${r.damper}` : ''}${r.hr ? `, puls ${r.hr}` : ''}${r.kcal ? `, ${r.kcal} kcal` : ''}` +
      `${r.planned ? ` [plan: ${r.planned}]` : ''}${r.note ? ` – "${r.note}"` : ''}`);
  });

  const B = [...s.body].sort((a, b) => a.date.localeCompare(b.date)).slice(-16);
  lines.push(`\n## Kroppsmål / Tanita (siste ${B.length})`);
  B.forEach((b) => {
    const parts = [['vekt', b.weight, 'kg'], ['midje', b.waist, 'cm'], ['fett', b.fat, '%'], ['fettmasse', b.fatMass, 'kg'], ['muskelmasse', b.muscle, 'kg'], ['visceralt', b.visceral, ''], ['BMR', b.bmr, 'kcal'], ['hofte', b.hip, 'cm'], ['bryst', b.chest, 'cm'], ['arm', b.arm, 'cm']]
      .filter((p) => p[1]).map((p) => `${p[0]} ${p[1]}${p[2] ? ' ' + p[2] : ''}`);
    lines.push(`${b.date}: ${parts.join(', ')}${b.note ? ` – "${b.note}"` : ''}`);
  });
  const rate = weightRate();
  if (rate) lines.push(`Vektendring: ${fmtNum(rate.perWeek, 2)} kg/uke over ${fmtNum(rate.weeks)} uker`);

  const pu = (s.habits?.pushups || []).filter((d) => daysAgo(d) < 14).length;
  lines.push(`\n## Vane: 10 armhevinger om morgenen – ${pu} av de siste 14 dagene`);

  const foodDays = [...new Set(s.food.filter((f) => daysAgo(f.date) < 14).map((f) => f.date))].sort();
  lines.push(`\n## Matlogg siste 14 dager (${foodDays.length} dager logget)`);
  foodDays.forEach((d) => {
    const t = foodTotals(d);
    lines.push(`${d}: ${Math.round(t.kcal)} kcal, P ${Math.round(t.protein)} g, K ${Math.round(t.carbs)} g, F ${Math.round(t.fat)} g`);
  });
  const mp = Object.entries(s.mealPlan).filter(([, v]) => v.length);
  if (mp.length) {
    lines.push('\n## Matplan');
    mp.forEach(([day, items]) => lines.push(`${day}: ` + items.map((i) => `${i.meal}: ${i.desc}${i.kcal ? ` (${i.kcal} kcal)` : ''}`).join('; ')));
  }
  return lines.join('\n');
}
