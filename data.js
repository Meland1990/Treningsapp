// Lagring, standarddata og beregninger. Alt lagres lokalt på enheten (localStorage).

const KEY = 'treningsdagbok_v1';

export const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
export const MEALS = ['Frokost', 'Lunsj', 'Mellommåltid', 'Middag', 'Kveldsmat'];
export const ROW_TYPES = ['Rolig (UT2)', 'Moderat (UT1)', 'Terskel (AT)', 'Intervall', 'Test 2000 m', 'Test 5000 m', 'Annet'];

// Eksempelplan. Bytt ut med din egen plan under Innstillinger → Treningsplan,
// eller lim inn planen som tekst og la Claude gjøre den om (Coach-fanen).
export const DEFAULT_PLAN = {
  name: 'Eksempelplan – bytt ut med din egen',
  days: [
    {
      id: 'a', name: 'Økt A – Underkropp + kjerne',
      exercises: [
        { name: 'Knebøy', sets: 4, reps: '6-8' },
        { name: 'Rumensk markløft', sets: 3, reps: '8-10' },
        { name: 'Utfall', sets: 3, reps: '10-12' },
        { name: 'Planke (sek)', sets: 3, reps: '30-60' },
      ],
    },
    {
      id: 'b', name: 'Økt B – Overkropp',
      exercises: [
        { name: 'Benkpress', sets: 4, reps: '6-8' },
        { name: 'Sittende roing', sets: 4, reps: '8-10' },
        { name: 'Skulderpress', sets: 3, reps: '8-10' },
        { name: 'Nedtrekk', sets: 3, reps: '10-12' },
      ],
    },
    {
      id: 'c', name: 'Økt C – Helkropp',
      exercises: [
        { name: 'Markløft', sets: 3, reps: '5' },
        { name: 'Skrå hantelpress', sets: 3, reps: '8-12' },
        { name: 'Pullups', sets: 3, reps: '6-10' },
        { name: 'Farmer walk (m)', sets: 3, reps: '30' },
      ],
    },
  ],
  rowing: 'Roing 2–3 ganger i uken: 1 rolig langtur (30–45 min, 18–22 tak/min), 1 intervalløkt, evt. kort rolig økt etter styrke.',
};

const DEFAULT_STATE = {
  version: 1,
  settings: {
    name: '',
    goal: '',
    heightCm: '',
    kcalTarget: 2400,
    proteinTarget: 160,
    apiKey: '',
    model: 'claude-opus-5-5',
    effort: 'medium',
  },
  plan: DEFAULT_PLAN,
  workouts: [],   // { id, date, dayId, dayName, exercises:[{name, target, extra, sets:[{w, r}]}], note, rpe, durationMin }
  rows: [],       // { id, date, type, distance, timeSec, spm, watt, hr, kcal, drag, note }
  body: [],       // { id, date, weight, waist, hip, chest, arm, thigh, fat, note }
  mealPlan: {},   // { Mandag: [{ meal, desc, kcal, protein }] }
  food: [],       // { id, date, meal, desc, kcal, protein, carbs, fat }
  coach: { messages: [], snapshot: '', startedAt: null },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
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

const LOWER = /(knebøy|markløft|beinpress|benpress|hip thrust|utfall|squat|deadlift|leg press|bulgarsk)/i;

// Dobbel progresjon: når alle sett når toppen av rep-intervallet → øk vekten.
export function suggestNext(name, repsTarget) {
  const hist = exerciseHistory(name);
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const range = parseRepRange(repsTarget || last.target);
  const topW = last.top;
  if (!range || !topW) return { weight: topW || '', text: `Sist: ${describeSets(last.sets)}` };
  const workSets = last.sets.filter((s) => Number(s.w) === topW);
  const step = LOWER.test(name) ? 5 : 2.5;
  if (workSets.every((s) => s.r >= range.hi)) {
    return { weight: topW + step, text: `Alle sett på ${range.hi}+ reps sist – prøv ${fmtNum(topW + step)} kg (+${step}).` };
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

// ---------- Tips (regelbasert, fungerer uten Claude) ----------
export function generateTips() {
  const tips = [];
  const s = state;
  const sortedW = [...s.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const sortedR = [...s.rows].sort((a, b) => b.date.localeCompare(a.date));
  const lastActivity = [sortedW[0]?.date, sortedR[0]?.date].filter(Boolean).sort().pop();

  if (!s.workouts.length && !s.rows.length) {
    tips.push({ kind: '', text: 'Velkommen! Start med å legge inn treningsplanen din under ⚙︎ → Treningsplan, eller lim den inn i Coach-fanen så gjør Claude den om for deg.' });
    return tips;
  }
  if (lastActivity && daysAgo(lastActivity) >= 4) {
    tips.push({ kind: 'warn', text: `Det er ${daysAgo(lastActivity)} dager siden siste økt. En rolig 20-minutters roøkt er en fin måte å komme i gang igjen.` });
  }

  // Treningsfrekvens siste 7 dager
  const last7W = s.workouts.filter((w) => daysAgo(w.date) < 7).length;
  const last7R = s.rows.filter((r) => daysAgo(r.date) < 7).length;
  if (last7W + last7R >= 5) tips.push({ kind: 'good', text: `Sterk uke: ${last7W} styrkeøkter og ${last7R} roøkter siste 7 dager. Husk søvn og minst én hviledag.` });

  // Progresjon på hovedløft
  const names = new Set(s.plan.days.flatMap((d) => d.exercises.map((e) => e.name)));
  for (const n of names) {
    const h = exerciseHistory(n);
    if (h.length >= 4) {
      const first = h[h.length - 4].best, last = h[h.length - 1].best;
      const pct = ((last - first) / first) * 100;
      if (pct >= 5) tips.push({ kind: 'good', text: `${n}: estimert 1RM opp ${fmtNum(pct)} % over de siste 4 øktene. 💪` });
      else if (Math.abs(pct) < 1.5) tips.push({ kind: 'warn', text: `${n}: lite fremgang siste 4 økter. Vurder å bytte rep-intervall, legge til et sett, eller ta en lettere uke.` });
    }
  }

  // Midjemål-trend
  const waist = s.body.filter((b) => b.waist).sort((a, b) => a.date.localeCompare(b.date));
  if (waist.length >= 2) {
    const a = waist[0], b = waist[waist.length - 1];
    const diff = b.waist - a.waist;
    const weeks = Math.max(1, daysAgo(a.date) / 7 - daysAgo(b.date) / 7);
    if (diff < 0) tips.push({ kind: 'good', text: `Midjen er ned ${fmtNum(-diff)} cm siden ${fmtDate(a.date)} (${fmtNum(-diff / weeks)} cm/uke).` });
    else if (diff > 1) tips.push({ kind: 'warn', text: `Midjen er opp ${fmtNum(diff)} cm siden ${fmtDate(a.date)}. Se på kaloriinntaket og at proteinmålet nås.` });
  }
  const lastBody = [...s.body].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastBody || daysAgo(lastBody.date) >= 7) tips.push({ kind: '', text: 'Tid for å måle midje og vekt – helst samme ukedag, om morgenen før frokost.' });

  // Roing
  if (sortedR.length >= 3) {
    const steady = sortedR.filter((r) => /UT2|UT1|Rolig|Moderat/.test(r.type) && r.distance >= 3000);
    if (steady.length >= 4) {
      const recent = steady.slice(0, 2).map((r) => splitPer500(r));
      const older = steady.slice(2, 4).map((r) => splitPer500(r));
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const diff = avg(older) - avg(recent);
      if (diff > 1) tips.push({ kind: 'good', text: `Rolige roøkter går ${fmtNum(diff)} sek/500 m raskere enn før. Aerob form bedres!` });
    }
    const hard = sortedR.filter((r) => daysAgo(r.date) < 14 && /Intervall|Terskel|Test/.test(r.type)).length;
    const easy = sortedR.filter((r) => daysAgo(r.date) < 14 && /Rolig|Moderat/.test(r.type)).length;
    if (hard > easy && hard >= 2) tips.push({ kind: 'warn', text: 'Mange harde roøkter i det siste. Ca. 80 % av roingen bør være rolig (snakketempo, 18–22 tak/min).' });
  }
  if (!s.rows.length) tips.push({ kind: '', text: 'Logg roøktene dine under Roing – du får splitt, watt og fremgang automatisk.' });

  // Protein
  const days = [...new Set(s.food.filter((f) => daysAgo(f.date) < 7).map((f) => f.date))];
  if (days.length >= 3 && s.settings.proteinTarget) {
    const avgP = days.reduce((a, d) => a + foodTotals(d).protein, 0) / days.length;
    if (avgP < s.settings.proteinTarget * 0.85) tips.push({ kind: 'warn', text: `Snitt protein siste uke: ${Math.round(avgP)} g/dag (mål ${s.settings.proteinTarget} g). Legg inn f.eks. skyr, cottage cheese eller kylling.` });
    else tips.push({ kind: 'good', text: `Proteinmålet nås godt: snitt ${Math.round(avgP)} g/dag siste uke.` });
  }
  return tips;
}

// ---------- Sammendrag for Claude ----------
export function buildSnapshot({ weeks = 8 } = {}) {
  const s = state;
  const cutoff = (iso) => daysAgo(iso) <= weeks * 7;
  const lines = [];
  lines.push(`# Treningsdagbok – data per ${today()}`);
  const st = s.settings;
  lines.push(`Navn: ${st.name || '-'} | Høyde: ${st.heightCm || '-'} cm | Mål: ${st.goal || '-'}`);
  lines.push(`Ernæringsmål: ${st.kcalTarget || '-'} kcal, ${st.proteinTarget || '-'} g protein per dag`);

  lines.push(`\n## Nåværende treningsplan: ${s.plan.name}`);
  s.plan.days.forEach((d) => {
    lines.push(`- ${d.name}: ` + d.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.note ? ` (${e.note})` : ''}`).join('; '));
  });
  if (s.plan.rowing) lines.push(`- Roing: ${s.plan.rowing}`);

  const W = s.workouts.filter((w) => cutoff(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  lines.push(`\n## Styrkeøkter siste ${weeks} uker (${W.length} stk). Format: øvelse: kg×reps per sett`);
  W.forEach((w) => {
    lines.push(`${w.date} ${w.dayName || ''}${w.rpe ? ` RPE ${w.rpe}` : ''}${w.note ? ` – "${w.note}"` : ''}`);
    w.exercises.forEach((e) => {
      if (!e.sets.some((x) => x.r > 0)) return;
      lines.push(`  ${e.name}${e.extra ? ' [ekstra]' : ''}: ${describeSets(e.sets.filter((x) => x.r > 0))}`);
    });
  });

  const R = s.rows.filter((r) => cutoff(r.date)).sort((a, b) => a.date.localeCompare(b.date));
  lines.push(`\n## Roøkter siste ${weeks} uker (${R.length} stk)`);
  R.forEach((r) => {
    const sp = splitPer500(r);
    lines.push(`${r.date} ${r.type}: ${r.distance} m på ${fmtTime(r.timeSec)}, splitt ${fmtTime(sp, 1)}/500m, ${Math.round(rowWatt(r)) || '-'} W` +
      `${r.spm ? `, ${r.spm} tak/min` : ''}${r.hr ? `, puls ${r.hr}` : ''}${r.kcal ? `, ${r.kcal} kcal` : ''}${r.note ? ` – "${r.note}"` : ''}`);
  });

  const B = [...s.body].sort((a, b) => a.date.localeCompare(b.date)).slice(-16);
  lines.push(`\n## Kroppsmål (siste ${B.length})`);
  B.forEach((b) => {
    const parts = [['vekt', b.weight, 'kg'], ['midje', b.waist, 'cm'], ['hofte', b.hip, 'cm'], ['bryst', b.chest, 'cm'], ['arm', b.arm, 'cm'], ['lår', b.thigh, 'cm'], ['fett', b.fat, '%']]
      .filter((p) => p[1]).map((p) => `${p[0]} ${p[1]} ${p[2]}`);
    lines.push(`${b.date}: ${parts.join(', ')}${b.note ? ` – "${b.note}"` : ''}`);
  });

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
