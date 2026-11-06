import {
  getState, save, replaceState, resetAll, uid, today, fmtDate, daysAgo, weekdayName, isoWeek,
  parseTime, fmtTime, splitPer500, rowWatt, wattFromSplit, e1rm, exerciseHistory, allExerciseNames,
  suggestNext, describeSets, fmtNum, foodTotals, generateTips, buildSnapshot,
  WEEKDAYS, MEALS, ROW_TYPES, DEFAULT_PLAN,
} from './data.js';
import { lineChart, barChart } from './charts.js';
import { askClaude, SYSTEM_PROMPT, extractJsonBlocks, isPlan, isMealPlan } from './coach.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : '';
};
const S = () => getState();

const ui = {
  tab: 'home',
  strengthSub: 'log',
  foodSub: 'today',
  foodDate: today(),
  mealDay: weekdayName(today()),
  progressExercise: '',
  bodyMetric: 'waist',
  rowMetric: 'split',
  coachBusy: false,
  streamText: '',
};
try { Object.assign(ui, JSON.parse(localStorage.getItem('treningsdagbok_ui') || '{}'), { coachBusy: false, streamText: '', foodDate: today() }); } catch { /* ignorer */ }
const saveUi = () => { try { localStorage.setItem('treningsdagbok_ui', JSON.stringify({ tab: ui.tab, strengthSub: ui.strengthSub, foodSub: ui.foodSub, progressExercise: ui.progressExercise, bodyMetric: ui.bodyMetric, rowMetric: ui.rowMetric })); } catch { /* ignorer */ } };

const TITLES = { home: 'Oversikt', strength: 'Styrke', row: 'Roing', body: 'Kroppsmål', food: 'Mat', coach: 'Claude-coach', settings: 'Innstillinger' };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2400);
}

function setTab(tab) {
  ui.tab = tab;
  saveUi();
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render();
  window.scrollTo(0, 0);
}

function render() {
  $('#viewTitle').textContent = TITLES[ui.tab];
  const views = { home: viewHome, strength: viewStrength, row: viewRow, body: viewBody, food: viewFood, coach: viewCoach, settings: viewSettings };
  $('#view').innerHTML = views[ui.tab]();
  afterRender();
}

function afterRender() {
  if (ui.tab === 'coach') {
    const chat = $('#chatEnd');
    if (chat && ui.coachBusy) chat.scrollIntoView({ block: 'end' });
  }
}

// ============================================================ HJEM
function viewHome() {
  const s = S();
  const last7W = s.workouts.filter((w) => daysAgo(w.date) < 7).length;
  const last7R = s.rows.filter((r) => daysAgo(r.date) < 7);
  const meters7 = last7R.reduce((a, r) => a + (Number(r.distance) || 0), 0);
  const bodySorted = [...s.body].sort((a, b) => b.date.localeCompare(a.date));
  const lastWaist = bodySorted.find((b) => b.waist);
  const lastWeight = bodySorted.find((b) => b.weight);
  const t = foodTotals(today());

  const next = nextPlanDay();
  const tips = generateTips();

  const recent = [
    ...s.workouts.map((w) => ({ date: w.date, icon: '🏋️', text: `${w.dayName || 'Styrkeøkt'} – ${w.exercises.filter((e) => e.sets.some((x) => x.r > 0)).length} øvelser` })),
    ...s.rows.map((r) => ({ date: r.date, icon: '🚣', text: `${r.type}: ${fmtNum(r.distance / 1000, 2)} km, ${fmtTime(splitPer500(r), 1)}/500 m` })),
    ...s.body.map((b) => ({ date: b.date, icon: '📏', text: [b.waist && `Midje ${fmtNum(b.waist)} cm`, b.weight && `Vekt ${fmtNum(b.weight)} kg`].filter(Boolean).join(', ') || 'Kroppsmål' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return `
    <div class="card">
      <div class="grid2">
        <div class="stat"><div class="v">${last7W}</div><div class="l">Styrkeøkter siste 7 d</div></div>
        <div class="stat"><div class="v">${fmtNum(meters7 / 1000, 1)} km</div><div class="l">Roing siste 7 d (${last7R.length} økter)</div></div>
        <div class="stat"><div class="v">${lastWaist ? fmtNum(lastWaist.waist) + ' cm' : '–'}</div><div class="l">Midje ${lastWaist ? '(' + fmtDate(lastWaist.date) + ')' : ''}</div></div>
        <div class="stat"><div class="v">${lastWeight ? fmtNum(lastWeight.weight) + ' kg' : '–'}</div><div class="l">Vekt ${lastWeight ? '(' + fmtDate(lastWeight.date) + ')' : ''}</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Neste økt</h2>
      ${next ? `<p style="margin:0 0 10px"><b>${esc(next.name)}</b><br><span class="muted">${next.exercises.map((e) => esc(e.name)).join(' · ')}</span></p>
        <div class="row"><button class="btn" data-action="start-workout" data-day="${esc(next.id)}">Start økt</button>
        <button class="btn secondary" data-action="goto" data-tab="row">Logg roøkt</button></div>` : '<p class="muted">Legg inn en treningsplan under ⚙︎.</p>'}
    </div>

    <div class="card">
      <h2>Mat i dag</h2>
      ${macroBar('Kalorier', t.kcal, s.settings.kcalTarget, 'kcal')}
      ${macroBar('Protein', t.protein, s.settings.proteinTarget, 'g')}
      <button class="btn secondary small" data-action="goto" data-tab="food" style="margin-top:8px">Før mat</button>
    </div>

    <div class="card">
      <h2>Tips</h2>
      ${tips.map((t) => `<div class="tip ${t.kind}">${esc(t.text)}</div>`).join('') || '<p class="muted">Ingen tips akkurat nå – fortsett slik!</p>'}
      <button class="btn secondary small" data-action="goto" data-tab="coach">Spør Claude om en full analyse →</button>
    </div>

    <div class="card">
      <h2>Siste aktivitet</h2>
      ${recent.length ? `<ul class="list">${recent.map((r) => `<li><div class="top"><span>${r.icon} ${esc(r.text)}</span><span class="muted small">${fmtDate(r.date)}</span></div></li>`).join('')}</ul>` : '<div class="empty">Ingenting logget ennå.</div>'}
    </div>`;
}

function macroBar(label, val, target, unit) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  const over = target && val > target * 1.05;
  return `<div class="field"><div class="row"><span class="small">${label}</span><span class="spacer"></span><span class="small"><b>${Math.round(val)}</b> / ${target || '–'} ${unit}</span></div>
    <div class="progress ${over ? 'over' : ''}"><div style="width:${pct}%"></div></div></div>`;
}

function nextPlanDay() {
  const s = S();
  if (!s.plan.days.length) return null;
  const last = [...s.workouts].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (!last) return s.plan.days[0];
  const idx = s.plan.days.findIndex((d) => d.id === last.dayId);
  return s.plan.days[(idx + 1) % s.plan.days.length] || s.plan.days[0];
}

// ============================================================ STYRKE
function subTabs(current, items, action) {
  return `<div class="chips">${items.map(([k, l]) => `<button class="chip ${current === k ? 'active' : ''}" data-action="${action}" data-v="${k}">${l}</button>`).join('')}</div>`;
}

function viewStrength() {
  const head = subTabs(ui.strengthSub, [['log', 'Logg økt'], ['history', 'Historikk'], ['progress', 'Fremgang']], 'strength-sub');
  if (ui.strengthSub === 'history') return head + strengthHistory();
  if (ui.strengthSub === 'progress') return head + strengthProgress();
  return head + strengthLog();
}

function newDraft(dayId) {
  const s = S();
  const day = s.plan.days.find((d) => d.id === dayId);
  const exercises = (day?.exercises || []).map((e) => {
    const sug = suggestNext(e.name, e.reps);
    return {
      name: e.name,
      target: `${e.sets}×${e.reps}`,
      reps: e.reps,
      note: e.note || '',
      extra: false,
      sets: Array.from({ length: Number(e.sets) || 3 }, () => ({ w: sug?.weight ?? '', r: '' })),
    };
  });
  s.draft = { id: uid(), date: today(), dayId: day?.id || '', dayName: day?.name || 'Fri økt', exercises, note: '', rpe: '', durationMin: '' };
  save();
}

function strengthLog() {
  const s = S();
  const d = s.draft;
  const dayChips = `<div class="chips">${s.plan.days.map((day) => `<button class="chip ${d?.dayId === day.id ? 'active' : ''}" data-action="start-workout" data-day="${esc(day.id)}">${esc(day.name)}</button>`).join('')}
    <button class="chip ${d && !d.dayId ? 'active' : ''}" data-action="start-workout" data-day="">Fri økt</button></div>`;

  if (!d) {
    const next = nextPlanDay();
    return `<div class="card"><h2>Velg økt</h2>${dayChips}
      ${next ? `<p class="muted">Forslag etter planen: <b>${esc(next.name)}</b></p>` : ''}</div>`;
  }

  const names = allExerciseNames();
  return `
    <div class="card">
      <h2>Velg økt</h2>${dayChips}
      <div class="grid3">
        <div class="field"><label>Dato</label><input type="date" data-draft="date" value="${esc(d.date)}"></div>
        <div class="field"><label>Varighet (min)</label><input inputmode="numeric" data-draft="durationMin" value="${esc(d.durationMin)}"></div>
        <div class="field"><label>Anstrengelse (RPE 1–10)</label><input inputmode="decimal" data-draft="rpe" value="${esc(d.rpe)}"></div>
      </div>
    </div>

    ${d.exercises.map((ex, i) => exerciseCard(ex, i)).join('')}

    <div class="card">
      <h2>Legg til ekstra øvelse</h2>
      <div class="row">
        <input id="extraName" list="exNames" placeholder="F.eks. Bicepscurl" style="flex:1">
        <datalist id="exNames">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <button class="btn secondary" data-action="add-extra">Legg til</button>
      </div>
    </div>

    <div class="card">
      <div class="field"><label>Notat (dagsform, smerter, hva gikk bra …)</label><textarea data-draft="note">${esc(d.note)}</textarea></div>
      <div class="row">
        <button class="btn" data-action="save-workout">Lagre økt</button>
        <span class="spacer"></span>
        <button class="btn danger small" data-action="discard-workout">Forkast</button>
      </div>
    </div>`;
}

function exerciseCard(ex, i) {
  const sug = suggestNext(ex.name, ex.reps);
  return `<div class="card exercise">
    <div class="head"><div><div class="name">${esc(ex.name)}${ex.extra ? ' <span class="muted small">(ekstra)</span>' : ''}</div>
      ${ex.target ? `<div class="target">Mål: ${esc(ex.target)}${ex.note ? ' · ' + esc(ex.note) : ''}</div>` : ''}</div>
      <button class="x" data-action="remove-ex" data-i="${i}" aria-label="Fjern øvelse">✕</button></div>
    ${sug ? `<div class="suggest">💡 ${esc(sug.text)}</div>` : '<div class="muted small">Første gang – finn en vekt du klarer med god teknikk.</div>'}
    <div class="set-row muted small"><span></span><span style="text-align:center">kg</span><span style="text-align:center">reps</span><span></span></div>
    ${ex.sets.map((st, j) => `<div class="set-row"><span class="n">${j + 1}</span>
      <input inputmode="decimal" data-set="${i}:${j}:w" value="${esc(st.w)}" placeholder="kg">
      <input inputmode="numeric" data-set="${i}:${j}:r" value="${esc(st.r)}" placeholder="reps">
      <button class="x" data-action="remove-set" data-i="${i}" data-j="${j}" aria-label="Fjern sett">−</button></div>`).join('')}
    <div class="row" style="margin-top:8px"><button class="btn ghost small" data-action="add-set" data-i="${i}">+ Sett</button></div>
  </div>`;
}

function strengthHistory() {
  const W = [...S().workouts].sort((a, b) => b.date.localeCompare(a.date));
  if (!W.length) return '<div class="card"><div class="empty">Ingen økter logget ennå.</div></div>';
  return `<div class="card"><ul class="list">${W.map((w) => `<li>
      <details><summary><span>${fmtDate(w.date)} – ${esc(w.dayName)}</span></summary>
        <div class="small" style="margin-top:6px">
        ${w.exercises.filter((e) => e.sets.some((x) => x.r > 0)).map((e) => `<div><b>${esc(e.name)}</b>${e.extra ? ' (ekstra)' : ''}: ${esc(describeSets(e.sets.filter((x) => x.r > 0)))}</div>`).join('')}
        ${w.rpe || w.durationMin ? `<div class="muted">${w.durationMin ? w.durationMin + ' min' : ''} ${w.rpe ? '· RPE ' + w.rpe : ''}</div>` : ''}
        ${w.note ? `<div class="muted">“${esc(w.note)}”</div>` : ''}
        </div>
        <div class="row" style="margin-top:8px"><button class="btn ghost small" data-action="edit-workout" data-id="${w.id}">Rediger</button>
        <button class="btn danger small" data-action="delete-workout" data-id="${w.id}">Slett</button></div>
      </details></li>`).join('')}</ul></div>`;
}

function strengthProgress() {
  const names = allExerciseNames().filter((n) => exerciseHistory(n).length);
  if (!names.length) return '<div class="card"><div class="empty">Logg noen økter for å se fremgang.</div></div>';
  if (!names.includes(ui.progressExercise)) ui.progressExercise = names[0];
  const h = exerciseHistory(ui.progressExercise);
  const best = h.reduce((a, x) => (x.best > a.best ? x : a), h[0]);
  const heaviest = h.reduce((a, x) => (x.top > a.top ? x : a), h[0]);

  // Ukentlig volum (kg × reps), siste 10 uker
  const weeks = {};
  S().workouts.forEach((w) => {
    const k = isoWeek(w.date);
    weeks[k] = (weeks[k] || 0) + w.exercises.reduce((a, e) => a + e.sets.reduce((b, st) => b + (Number(st.w) || 0) * (Number(st.r) || 0), 0), 0);
  });
  const wk = Object.keys(weeks).sort().slice(-10).map((k) => ({ label: k.split('-U')[1], value: weeks[k] }));

  // Rekorder per øvelse
  const prs = names.map((n) => {
    const hh = exerciseHistory(n);
    const b = hh.reduce((a, x) => (x.best > a.best ? x : a), hh[0]);
    return { n, best: b.best, top: Math.max(...hh.map((x) => x.top)), date: b.date };
  });

  return `
    <div class="card">
      <div class="field"><label>Øvelse</label><select data-ui="progressExercise">${names.map((n) => `<option ${n === ui.progressExercise ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div class="grid3">
        <div class="stat"><div class="v">${fmtNum(best.best)} kg</div><div class="l">Beste est. 1RM</div></div>
        <div class="stat"><div class="v">${fmtNum(heaviest.top)} kg</div><div class="l">Tyngste sett</div></div>
        <div class="stat"><div class="v">${h.length}</div><div class="l">Økter</div></div>
      </div>
      <h3>Estimert 1RM (Epley)</h3>
      ${lineChart(h.map((x) => ({ x: x.date, y: x.best })), { unit: 'kg', label: 'Estimert 1RM' })}
      <h3>Tyngste sett</h3>
      ${lineChart(h.map((x) => ({ x: x.date, y: x.top })), { unit: 'kg', label: 'Tyngste sett' })}
    </div>
    <div class="card"><h2>Ukentlig volum (kg × reps)</h2>${barChart(wk, { fmt: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)) })}</div>
    <div class="card"><h2>Rekorder</h2><table class="tbl"><tr><th>Øvelse</th><th>Est. 1RM</th><th>Tyngst</th></tr>
      ${prs.map((p) => `<tr><td>${esc(p.n)}</td><td>${fmtNum(p.best)} kg</td><td>${fmtNum(p.top)} kg</td></tr>`).join('')}</table></div>`;
}

// ============================================================ ROING
function viewRow() {
  const s = S();
  const R = [...s.rows].sort((a, b) => b.date.localeCompare(a.date));
  const best = (dist) => R.filter((r) => Number(r.distance) === dist).sort((a, b) => a.timeSec - b.timeSec)[0];
  const b2 = best(2000), b5 = best(5000), b6 = best(6000), b10 = best(10000);

  const metrics = { split: 'Splitt /500 m', watt: 'Snittwatt', distance: 'Distanse', spm: 'Tak/min', hr: 'Puls' };
  const chronological = [...R].reverse();
  const pts = chronological.map((r) => {
    const y = ui.rowMetric === 'split' ? splitPer500(r) : ui.rowMetric === 'watt' ? rowWatt(r) : Number(r[ui.rowMetric]) || NaN;
    return { x: r.date, y };
  });
  const chartFmt = ui.rowMetric === 'split' ? (v) => fmtTime(v) : undefined;

  const weeks = {};
  s.rows.forEach((r) => { const k = isoWeek(r.date); weeks[k] = (weeks[k] || 0) + (Number(r.distance) || 0); });
  const wk = Object.keys(weeks).sort().slice(-10).map((k) => ({ label: k.split('-U')[1], value: weeks[k] / 1000 }));

  return `
    <div class="card">
      <h2>Ny roøkt</h2>
      <form id="rowForm">
        <div class="grid2">
          <div class="field"><label>Dato</label><input type="date" name="date" value="${today()}"></div>
          <div class="field"><label>Type</label><select name="type">${ROW_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Distanse (m)</label><input name="distance" inputmode="numeric" placeholder="5000" required></div>
          <div class="field"><label>Tid (mm:ss eller t:mm:ss)</label><input name="time" placeholder="21:30.5" required></div>
          <div class="field"><label>Tak/min (snitt)</label><input name="spm" inputmode="numeric" placeholder="22"></div>
          <div class="field"><label>Snittwatt (tom = beregnes)</label><input name="watt" inputmode="numeric"></div>
          <div class="field"><label>Snittpuls</label><input name="hr" inputmode="numeric"></div>
          <div class="field"><label>Kcal</label><input name="kcal" inputmode="numeric"></div>
          <div class="field"><label>Dragfaktor</label><input name="drag" inputmode="numeric" placeholder="110–130"></div>
        </div>
        <div class="field"><label>Notat / intervaller (f.eks. 8×500 m / 1 min pause)</label><textarea name="note"></textarea></div>
        <div id="rowPreview" class="muted small" style="margin-bottom:8px"></div>
        <button class="btn" type="submit">Lagre roøkt</button>
      </form>
    </div>

    <div class="card">
      <h2>Rekorder</h2>
      <div class="grid2">
        <div class="stat"><div class="v">${b2 ? fmtTime(b2.timeSec, 1) : '–'}</div><div class="l">2000 m ${b2 ? '· ' + fmtTime(splitPer500(b2), 1) + '/500' : ''}</div></div>
        <div class="stat"><div class="v">${b5 ? fmtTime(b5.timeSec, 1) : '–'}</div><div class="l">5000 m ${b5 ? '· ' + fmtTime(splitPer500(b5), 1) + '/500' : ''}</div></div>
        <div class="stat"><div class="v">${b6 ? fmtTime(b6.timeSec, 1) : '–'}</div><div class="l">6000 m</div></div>
        <div class="stat"><div class="v">${b10 ? fmtTime(b10.timeSec, 1) : '–'}</div><div class="l">10 000 m</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Fremgang</h2>
      ${subTabs(ui.rowMetric, Object.entries(metrics), 'row-metric')}
      ${lineChart(pts, { invert: ui.rowMetric === 'split', fmt: chartFmt, label: metrics[ui.rowMetric] })}
      ${ui.rowMetric === 'split' ? '<p class="muted small">Lavere splitt = raskere. Grafen er snudd slik at opp er bedre. Sammenlign helst økter av samme type.</p>' : ''}
      <h3>Kilometer per uke</h3>
      ${barChart(wk, { fmt: (v) => fmtNum(v, 1) })}
    </div>

    <div class="card">
      <h2>Historikk</h2>
      ${R.length ? `<ul class="list">${R.map((r) => `<li><div class="top"><span><b>${esc(r.type)}</b> · ${fmtNum(r.distance)} m · ${fmtTime(r.timeSec, 1)}</span><span class="muted small">${fmtDate(r.date)}</span></div>
        <div class="small muted">${fmtTime(splitPer500(r), 1)}/500 m · ${Math.round(rowWatt(r)) || '–'} W${r.spm ? ' · ' + r.spm + ' t/min' : ''}${r.hr ? ' · ♥ ' + r.hr : ''}${r.kcal ? ' · ' + r.kcal + ' kcal' : ''}${r.drag ? ' · DF ' + r.drag : ''}</div>
        ${r.note ? `<div class="small">“${esc(r.note)}”</div>` : ''}
        <button class="btn danger small" style="margin-top:6px" data-action="delete-row" data-id="${r.id}">Slett</button></li>`).join('')}</ul>` : '<div class="empty">Ingen roøkter ennå.</div>'}
    </div>`;
}

// ============================================================ KROPP
const BODY_FIELDS = [['weight', 'Vekt', 'kg'], ['waist', 'Midje', 'cm'], ['hip', 'Hofte', 'cm'], ['chest', 'Bryst', 'cm'], ['arm', 'Overarm', 'cm'], ['thigh', 'Lår', 'cm'], ['fat', 'Fettprosent', '%']];

function viewBody() {
  const B = [...S().body].sort((a, b) => a.date.localeCompare(b.date));
  const metric = BODY_FIELDS.find((f) => f[0] === ui.bodyMetric) || BODY_FIELDS[1];
  const pts = B.filter((b) => b[metric[0]]).map((b) => ({ x: b.date, y: Number(b[metric[0]]) }));
  const first = pts[0], last = pts[pts.length - 1];
  const diff = first && last && pts.length > 1 ? last.y - first.y : null;
  return `
    <div class="card">
      <h2>Ny måling</h2>
      <form id="bodyForm">
        <div class="field"><label>Dato</label><input type="date" name="date" value="${today()}"></div>
        <div class="grid2">${BODY_FIELDS.map(([k, l, u]) => `<div class="field"><label>${l} (${u})</label><input name="${k}" inputmode="decimal"></div>`).join('')}</div>
        <div class="field"><label>Notat</label><input name="note"></div>
        <p class="muted small">Tips: Mål midjen i navlehøyde, etter en rolig utpust, samme ukedag om morgenen.</p>
        <button class="btn" type="submit">Lagre måling</button>
      </form>
    </div>
    <div class="card">
      <h2>Utvikling</h2>
      ${subTabs(ui.bodyMetric, BODY_FIELDS.map(([k, l]) => [k, l]), 'body-metric')}
      ${diff != null ? `<p class="small">${metric[1]}: ${fmtNum(first.y)} → <b>${fmtNum(last.y)} ${metric[2]}</b> (${diff > 0 ? '+' : ''}${fmtNum(diff)} ${metric[2]} siden ${fmtDate(first.x)})</p>` : ''}
      ${lineChart(pts, { unit: metric[2], label: metric[1] })}
    </div>
    <div class="card">
      <h2>Alle målinger</h2>
      ${B.length ? `<div style="overflow-x:auto"><table class="tbl"><tr><th>Dato</th>${BODY_FIELDS.map((f) => `<th>${f[1]}</th>`).join('')}<th></th></tr>
        ${[...B].reverse().map((b) => `<tr><td>${fmtDate(b.date)}</td>${BODY_FIELDS.map((f) => `<td>${b[f[0]] ? fmtNum(b[f[0]]) : ''}</td>`).join('')}
        <td><button class="x" data-action="delete-body" data-id="${b.id}" aria-label="Slett">✕</button></td></tr>`).join('')}</table></div>` : '<div class="empty">Ingen målinger ennå.</div>'}
    </div>`;
}

// ============================================================ MAT
function viewFood() {
  const head = subTabs(ui.foodSub, [['today', 'Matlogg'], ['plan', 'Matplan'], ['stats', 'Oversikt']], 'food-sub');
  if (ui.foodSub === 'plan') return head + foodPlan();
  if (ui.foodSub === 'stats') return head + foodStats();
  return head + foodLog();
}

function foodForm(id, extra = '') {
  return `<form id="${id}">
    ${extra}
    <div class="grid2">
      <div class="field"><label>Måltid</label><select name="meal">${MEALS.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Hva</label><input name="desc" required placeholder="F.eks. Havregrøt med bær"></div>
      <div class="field"><label>Kcal</label><input name="kcal" inputmode="numeric"></div>
      <div class="field"><label>Protein (g)</label><input name="protein" inputmode="decimal"></div>
      <div class="field"><label>Karbohydrat (g)</label><input name="carbs" inputmode="decimal"></div>
      <div class="field"><label>Fett (g)</label><input name="fat" inputmode="decimal"></div>
    </div>
    <button class="btn" type="submit">Legg til</button></form>`;
}

function foodLog() {
  const s = S();
  const d = ui.foodDate;
  const items = s.food.filter((f) => f.date === d);
  const t = foodTotals(d);
  const planToday = s.mealPlan[weekdayName(d)] || [];
  return `
    <div class="card">
      <div class="row"><input type="date" data-ui="foodDate" value="${d}" style="flex:1"></div>
      <div style="margin-top:10px">
        ${macroBar('Kalorier', t.kcal, s.settings.kcalTarget, 'kcal')}
        ${macroBar('Protein', t.protein, s.settings.proteinTarget, 'g')}
        <div class="muted small">Karbo ${Math.round(t.carbs)} g · Fett ${Math.round(t.fat)} g</div>
      </div>
      ${planToday.length ? `<button class="btn secondary small" style="margin-top:10px" data-action="food-from-plan">Legg inn ${weekdayName(d).toLowerCase()}ens matplan (${planToday.length} måltider)</button>` : ''}
    </div>
    <div class="card">
      ${MEALS.map((m) => {
        const list = items.filter((f) => f.meal === m);
        if (!list.length) return '';
        return `<h3>${m}</h3><ul class="list">${list.map((f) => `<li><div class="top"><span>${esc(f.desc)}</span>
          <span class="row small"><span class="muted">${f.kcal ? f.kcal + ' kcal' : ''}${f.protein ? ' · ' + fmtNum(f.protein) + ' g P' : ''}</span>
          <button class="x" data-action="delete-food" data-id="${f.id}" aria-label="Slett">✕</button></span></div></li>`).join('')}</ul>`;
      }).join('') || '<div class="empty">Ingenting ført denne dagen.</div>'}
    </div>
    <div class="card"><h2>Før mat</h2>${foodForm('foodForm')}</div>`;
}

function foodPlan() {
  const s = S();
  const day = ui.mealDay;
  const list = s.mealPlan[day] || [];
  const sum = list.reduce((a, i) => ({ kcal: a.kcal + (Number(i.kcal) || 0), protein: a.protein + (Number(i.protein) || 0) }), { kcal: 0, protein: 0 });
  return `
    <div class="card">
      <div class="chips">${WEEKDAYS.map((w) => `<button class="chip ${w === day ? 'active' : ''}" data-action="meal-day" data-v="${w}">${w.slice(0, 3)}</button>`).join('')}</div>
      <h2>${day}</h2>
      ${list.length ? `<ul class="list">${list.map((i, idx) => `<li><div class="top"><span><b>${esc(i.meal)}:</b> ${esc(i.desc)}</span>
        <span class="row small"><span class="muted">${i.kcal ? i.kcal + ' kcal' : ''}${i.protein ? ' · ' + i.protein + ' g P' : ''}</span>
        <button class="x" data-action="delete-mealplan" data-i="${idx}" aria-label="Slett">✕</button></span></div></li>`).join('')}</ul>
        <p class="small">Sum: <b>${sum.kcal} kcal</b>, <b>${sum.protein} g protein</b></p>` : '<div class="empty">Ingen måltider planlagt.</div>'}
      <div class="row"><button class="btn ghost small" data-action="copy-mealplan">Kopier ${day.toLowerCase()} til alle dager</button></div>
    </div>
    <div class="card"><h2>Legg til i matplan</h2>${foodForm('mealPlanForm')}
      <p class="muted small">Du kan også be Claude-coachen lage en matplan – den kan importeres med ett trykk.</p></div>`;
}

function foodStats() {
  const s = S();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    days.push({ iso, ...foodTotals(iso) });
  }
  const logged = days.filter((d) => d.count);
  const avg = (k) => (logged.length ? logged.reduce((a, d) => a + d[k], 0) / logged.length : 0);
  return `
    <div class="card"><h2>Snitt siste 14 dager (${logged.length} dager logget)</h2>
      <div class="grid2">
        <div class="stat"><div class="v">${Math.round(avg('kcal'))}</div><div class="l">kcal/dag (mål ${s.settings.kcalTarget})</div></div>
        <div class="stat"><div class="v">${Math.round(avg('protein'))} g</div><div class="l">protein/dag (mål ${s.settings.proteinTarget})</div></div>
      </div></div>
    <div class="card"><h2>Kalorier</h2>${barChart(days.map((d) => ({ label: String(new Date(d.iso + 'T12:00').getDate()), value: d.kcal })))}</div>
    <div class="card"><h2>Protein (g)</h2>${barChart(days.map((d) => ({ label: String(new Date(d.iso + 'T12:00').getDate()), value: d.protein })))}</div>`;
}

// ============================================================ COACH
function renderMarkdown(md) {
  let h = esc(md);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, code) => `<pre>${code}</pre>`);
  h = h.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  h = h.replace(/^(?:[-*] .*(?:\n|$))+/gm, (block) => `<ul>${block.trim().split('\n').map((l) => `<li>${l.replace(/^[-*] /, '')}</li>`).join('')}</ul>`);
  return h;
}

function viewCoach() {
  const s = S();
  const hasKey = !!s.settings.apiKey;
  const msgs = s.coach.messages;
  const quick = [
    ['Gi meg en analyse av den siste måneden: fremgang, hva som går bra, hva jeg bør justere.', '📊 Månedsanalyse'],
    ['Basert på dataene mine: foreslå justert treningsprogram for de neste 4–6 ukene, inkludert roøkter.', '🗓️ Nytt program'],
    ['Lag en ukentlig matplan som passer målet mitt og treningsmengden min.', '🥗 Matplan'],
    ['Hvordan bør jeg legge opp roingen for å bli bedre på 2000 m og samtidig støtte fettforbrenning?', '🚣 Rotips'],
    ['Hvilke vekter og reps bør jeg sikte på i neste økt?', '🎯 Neste økt'],
  ];

  const chat = msgs.map((m, idx) => {
    if (m.role === 'user') {
      const txt = typeof m.content === 'string' ? m.content : m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      return `<div class="msg user">${esc(txt.replace(/^[\s\S]*<<SPØRSMÅL>>\n/, ''))}</div>`;
    }
    const txt = (m.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const blocks = extractJsonBlocks(txt);
    const actions = blocks.map((b, bi) => {
      if (isPlan(b)) return `<button class="btn small" data-action="apply-plan" data-m="${idx}" data-b="${bi}">✅ Bruk denne treningsplanen</button>`;
      if (isMealPlan(b)) return `<button class="btn small" data-action="apply-mealplan" data-m="${idx}" data-b="${bi}">✅ Bruk denne matplanen</button>`;
      return '';
    }).join(' ');
    return `<div class="msg assistant">${renderMarkdown(txt)}${actions ? `<div class="row" style="margin-top:8px">${actions}</div>` : ''}</div>`;
  }).join('');

  return `
    ${!hasKey ? `<div class="card"><h2>Koble til Claude</h2>
      <p class="small">For at Claude skal kunne lese dataene dine og tilpasse planen direkte i appen, trenger du en API-nøkkel fra <b>platform.claude.com</b> (betales per bruk, typisk noen få kroner per analyse). Legg den inn under ⚙︎ Innstillinger.</p>
      <p class="small">Uten nøkkel: trykk <b>Kopier data til Claude</b> og lim inn i en vanlig samtale med Claude (claude.ai-appen).</p>
      <div class="row"><button class="btn" data-action="open-settings">Legg inn API-nøkkel</button><button class="btn secondary" data-action="copy-snapshot">Kopier data til Claude</button></div></div>` : ''}

    <div class="card">
      <div class="row"><h2 style="margin:0">Samtale</h2><span class="spacer"></span>
        ${msgs.length ? '<button class="btn ghost small" data-action="new-chat">Ny samtale</button>' : ''}
        <button class="btn ghost small" data-action="copy-snapshot">Kopier data</button></div>
      ${msgs.length ? `<p class="muted small">Claude ser dataene dine slik de var ${fmtDate(s.coach.startedAt)}. Start ny samtale for å sende oppdaterte data.</p>` : '<p class="muted small">Claude får automatisk med treningsplanen og alt du har logget de siste 8 ukene.</p>'}
      <div class="chips">${quick.map(([q, l]) => `<button class="chip" data-action="quick-ask" data-q="${esc(q)}" ${ui.coachBusy ? 'disabled' : ''}>${l}</button>`).join('')}</div>
      <div class="chat">${chat}
        ${ui.coachBusy ? `<div class="msg assistant" id="streamMsg">${ui.streamText ? renderMarkdown(ui.streamText) : '<span class="muted">Claude tenker …</span>'}</div>` : ''}
        <div id="chatEnd"></div></div>
      <form id="coachForm" style="margin-top:10px">
        <textarea name="q" placeholder="Spør Claude om trening, roing, mat …" ${ui.coachBusy ? 'disabled' : ''}></textarea>
        <div class="row end" style="margin-top:6px"><button class="btn" type="submit" ${ui.coachBusy ? 'disabled' : ''}>Send</button></div>
      </form>
    </div>

    <div class="card">
      <details><summary>📋 Importer treningsplanen min fra tekst</summary>
        <p class="small muted">Lim inn treningsplanen du har fått (f.eks. fra en tidligere samtale med Claude). Claude gjør den om til appens format, og du kan ta den i bruk med ett trykk.</p>
        <form id="importPlanForm"><textarea name="plan" rows="8" placeholder="Mandag: Knebøy 4x6-8, Benkpress 4x8 …"></textarea>
        <button class="btn" type="submit" style="margin-top:6px" ${ui.coachBusy ? 'disabled' : ''}>Gjør om med Claude</button></form>
      </details>
    </div>`;
}

async function sendToCoach(question) {
  const s = S();
  if (!s.settings.apiKey) { toast('Legg inn API-nøkkel under Innstillinger først'); return; }
  if (ui.coachBusy) return;
  if (!s.coach.messages.length) {
    s.coach.snapshot = buildSnapshot();
    s.coach.startedAt = today();
  }
  const first = s.coach.messages.length === 0;
  const content = first ? `${s.coach.snapshot}\n\n<<SPØRSMÅL>>\n${question}` : question;
  s.coach.messages.push({ role: 'user', content });
  save();
  ui.coachBusy = true; ui.streamText = '';
  render();

  try {
    const res = await askClaude({
      apiKey: s.settings.apiKey,
      model: s.settings.model,
      effort: s.settings.effort,
      system: SYSTEM_PROMPT,
      messages: s.coach.messages,
      onText: (t) => {
        ui.streamText = t;
        const el = $('#streamMsg');
        if (el) { el.innerHTML = renderMarkdown(t); $('#chatEnd')?.scrollIntoView({ block: 'end' }); }
      },
    });
    s.coach.messages.push({ role: 'assistant', content: res.content });
  } catch (e) {
    s.coach.messages.pop(); // fjern spørsmålet slik at samtalen er gyldig
    if (!s.coach.messages.length) { s.coach.snapshot = ''; s.coach.startedAt = null; }
    alert(e.message);
  } finally {
    ui.coachBusy = false; ui.streamText = '';
    save();
    render();
    $('#chatEnd')?.scrollIntoView({ block: 'end' });
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Kopiert! Lim inn i Claude.');
  } catch {
    openModal(`<h2>Kopier teksten</h2><textarea style="min-height:50vh" readonly>${esc(text)}</textarea><div class="row end" style="margin-top:8px"><button class="btn" data-action="close-modal">Lukk</button></div>`);
  }
}

// ============================================================ INNSTILLINGER
function planToText(day) {
  return day.exercises.map((e) => [e.name, e.sets, e.reps, e.note || ''].join(' | ').replace(/ \| $/, '')).join('\n');
}
function textToExercises(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, sets, reps, note] = l.split('|').map((x) => x.trim());
    return { name, sets: Number(sets) || 3, reps: reps || '8-12', ...(note ? { note } : {}) };
  });
}

function viewSettings() {
  const s = S();
  const st = s.settings;
  return `
    <div class="card"><h2>Profil og mål</h2>
      <form id="profileForm">
        <div class="grid2">
          <div class="field"><label>Navn</label><input name="name" value="${esc(st.name)}"></div>
          <div class="field"><label>Høyde (cm)</label><input name="heightCm" inputmode="numeric" value="${esc(st.heightCm)}"></div>
          <div class="field"><label>Kalorimål / dag</label><input name="kcalTarget" inputmode="numeric" value="${esc(st.kcalTarget)}"></div>
          <div class="field"><label>Proteinmål (g/dag)</label><input name="proteinTarget" inputmode="numeric" value="${esc(st.proteinTarget)}"></div>
        </div>
        <div class="field"><label>Mål med treningen</label><textarea name="goal" placeholder="F.eks. redusere midjemål til 90 cm, bli sterkere, 2000 m under 7:30">${esc(st.goal)}</textarea></div>
        <button class="btn" type="submit">Lagre</button>
      </form></div>

    <div class="card"><h2>Claude-kobling</h2>
      <form id="apiForm">
        <div class="field"><label>Anthropic API-nøkkel</label><input name="apiKey" type="password" autocomplete="off" value="${esc(st.apiKey)}" placeholder="sk-ant-…"></div>
        <div class="grid2">
          <div class="field"><label>Modell</label><select name="model">
            ${[['claude-opus-5-5', 'Claude Opus 5.5 (anbefalt)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (billigere)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (billigst)']].map(([v, l]) => `<option value="${v}" ${st.model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>Grundighet</label><select name="effort">
            ${[['low', 'Lav (raskest)'], ['medium', 'Middels'], ['high', 'Høy (grundigst)']].map(([v, l]) => `<option value="${v}" ${st.effort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <p class="muted small">Lag nøkkel på platform.claude.com → API Keys. Nøkkelen lagres kun på denne enheten og sendes bare til Anthropic. Sett gjerne en månedlig utgiftsgrense på kontoen.</p>
        <button class="btn" type="submit">Lagre</button>
      </form></div>

    <div class="card"><h2>Treningsplan</h2>
      <form id="planForm">
        <div class="field"><label>Navn på plan</label><input name="planName" value="${esc(s.plan.name)}"></div>
        <p class="muted small">Én øvelse per linje: <code>Øvelse | sett | reps | notat</code>, f.eks. <code>Knebøy | 4 | 6-8 | 2 min pause</code></p>
        ${s.plan.days.map((d, i) => `<div class="exercise">
          <div class="row"><input name="dayName${i}" value="${esc(d.name)}" style="flex:1"><button type="button" class="x" data-action="remove-day" data-i="${i}" aria-label="Fjern dag">✕</button></div>
          <textarea name="dayEx${i}" rows="5" style="margin-top:6px">${esc(planToText(d))}</textarea></div>`).join('')}
        <div class="field"><label>Roopplegg</label><textarea name="rowing">${esc(s.plan.rowing || '')}</textarea></div>
        <div class="row"><button class="btn" type="submit">Lagre plan</button><button type="button" class="btn secondary" data-action="add-day">+ Ny øktdag</button>
          <span class="spacer"></span><button type="button" class="btn ghost small" data-action="reset-plan">Tilbakestill eksempel</button></div>
      </form></div>

    <div class="card"><h2>Sikkerhetskopi</h2>
      <p class="muted small">Dataene lagres bare i denne nettleseren. Ta jevnlig sikkerhetskopi, og bruk den for å flytte data mellom mobil og PC.</p>
      <div class="row"><button class="btn secondary" data-action="export">Last ned sikkerhetskopi</button>
      <label class="btn secondary" style="margin:0;color:var(--accent)">Gjenopprett fra fil<input type="file" id="importFile" accept="application/json,.json" hidden></label></div>
      <div class="row" style="margin-top:10px"><button class="btn danger small" data-action="reset-all">Slett alle data</button></div>
    </div>
    <div class="row"><button class="btn ghost block" data-action="goto" data-tab="home">← Tilbake</button></div>`;
}

// ============================================================ MODAL
function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').showModal(); }

// ============================================================ HENDELSER
document.addEventListener('click', async (e) => {
  const tabBtn = e.target.closest('#tabbar button');
  if (tabBtn) return setTab(tabBtn.dataset.tab);
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const s = S();
  const a = el.dataset.action;
  const i = Number(el.dataset.i);

  switch (a) {
    case 'goto': return setTab(el.dataset.tab);
    case 'open-settings': return setTab('settings');
    case 'close-modal': return $('#modal').close();
    case 'strength-sub': ui.strengthSub = el.dataset.v; saveUi(); return render();
    case 'food-sub': ui.foodSub = el.dataset.v; saveUi(); return render();
    case 'row-metric': ui.rowMetric = el.dataset.v; saveUi(); return render();
    case 'body-metric': ui.bodyMetric = el.dataset.v; saveUi(); return render();
    case 'meal-day': ui.mealDay = el.dataset.v; return render();

    case 'start-workout': {
      const hasData = s.draft?.exercises.some((x) => x.sets.some((st) => st.r));
      if (hasData && s.draft.dayId !== el.dataset.day && !confirm('Bytte økt? Det du har ført inn i denne økten forkastes.')) return;
      if (!s.draft || s.draft.dayId !== el.dataset.day || !hasData) newDraft(el.dataset.day);
      ui.tab = 'strength'; ui.strengthSub = 'log'; saveUi();
      $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'strength'));
      return render();
    }
    case 'add-set': {
      const ex = s.draft.exercises[i];
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({ w: lastSet?.w ?? '', r: '' });
      save(); return render();
    }
    case 'remove-set': s.draft.exercises[i].sets.splice(Number(el.dataset.j), 1); save(); return render();
    case 'remove-ex':
      if (!confirm(`Fjerne ${s.draft.exercises[i].name} fra økten?`)) return;
      s.draft.exercises.splice(i, 1); save(); return render();
    case 'add-extra': {
      const name = $('#extraName').value.trim();
      if (!name) return toast('Skriv navnet på øvelsen');
      const sug = suggestNext(name);
      s.draft.exercises.push({ name, target: '', reps: '', extra: true, sets: [1, 2, 3].map(() => ({ w: sug?.weight ?? '', r: '' })) });
      save(); return render();
    }
    case 'save-workout': {
      const d = s.draft;
      d.exercises.forEach((ex) => { ex.sets = ex.sets.filter((st) => st.r !== '' && st.r != null).map((st) => ({ w: num(st.w) || 0, r: num(st.r) || 0 })); });
      if (!d.exercises.some((ex) => ex.sets.length)) return toast('Før inn minst ett sett med reps');
      d.exercises = d.exercises.filter((ex) => ex.sets.length);
      const idx = s.workouts.findIndex((w) => w.id === d.id);
      const rec = { ...d, createdAt: Date.now() };
      if (idx >= 0) s.workouts[idx] = rec; else s.workouts.push(rec);
      s.draft = null; save();
      toast('Økt lagret 💪');
      ui.strengthSub = 'history'; saveUi();
      return render();
    }
    case 'discard-workout':
      if (!confirm('Forkaste økten?')) return;
      s.draft = null; save(); return render();
    case 'edit-workout': {
      const w = s.workouts.find((x) => x.id === el.dataset.id);
      s.draft = structuredClone(w); save();
      ui.strengthSub = 'log'; return render();
    }
    case 'delete-workout':
      if (!confirm('Slette økten?')) return;
      s.workouts = s.workouts.filter((w) => w.id !== el.dataset.id); save(); return render();

    case 'delete-row':
      if (!confirm('Slette roøkten?')) return;
      s.rows = s.rows.filter((r) => r.id !== el.dataset.id); save(); return render();
    case 'delete-body':
      if (!confirm('Slette målingen?')) return;
      s.body = s.body.filter((b) => b.id !== el.dataset.id); save(); return render();
    case 'delete-food':
      s.food = s.food.filter((f) => f.id !== el.dataset.id); save(); return render();
    case 'food-from-plan': {
      const plan = s.mealPlan[weekdayName(ui.foodDate)] || [];
      plan.forEach((p) => s.food.push({ id: uid(), date: ui.foodDate, ...p }));
      save(); toast(`La til ${plan.length} måltider`); return render();
    }
    case 'delete-mealplan': s.mealPlan[ui.mealDay].splice(i, 1); save(); return render();
    case 'copy-mealplan': {
      if (!confirm(`Overskrive alle andre dager med ${ui.mealDay.toLowerCase()}ens plan?`)) return;
      const src = s.mealPlan[ui.mealDay] || [];
      WEEKDAYS.forEach((w) => { if (w !== ui.mealDay) s.mealPlan[w] = structuredClone(src); });
      save(); toast('Kopiert'); return render();
    }

    case 'quick-ask': return sendToCoach(el.dataset.q);
    case 'new-chat':
      if (!confirm('Starte ny samtale? Den gamle slettes.')) return;
      s.coach = { messages: [], snapshot: '', startedAt: null }; save(); return render();
    case 'copy-snapshot':
      return copyText(`${SYSTEM_PROMPT}\n\n${buildSnapshot()}\n\nGi meg en analyse av treningen min og forslag til justeringer.`);
    case 'apply-plan':
    case 'apply-mealplan': {
      const m = s.coach.messages[Number(el.dataset.m)];
      const txt = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const obj = extractJsonBlocks(txt)[Number(el.dataset.b)];
      if (a === 'apply-plan') {
        if (!confirm(`Erstatte nåværende plan «${s.plan.name}» med «${obj.name}»? Historikken din beholdes.`)) return;
        s.plan = { name: obj.name || 'Ny plan', rowing: obj.rowing || '', days: obj.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises.map((x) => ({ name: x.name, sets: Number(x.sets) || 3, reps: String(x.reps ?? '8-12'), ...(x.note ? { note: x.note } : {}) })) })) };
        s.draft = null;
        toast('Ny treningsplan tatt i bruk');
      } else {
        if (!confirm('Erstatte matplanen?')) return;
        s.mealPlan = {};
        Object.entries(obj.mealPlan).forEach(([day, items]) => { if (WEEKDAYS.includes(day)) s.mealPlan[day] = items.map((x) => ({ meal: x.meal || 'Middag', desc: x.desc || '', kcal: num(x.kcal), protein: num(x.protein), carbs: num(x.carbs), fat: num(x.fat) })); });
        toast('Matplan tatt i bruk');
      }
      save(); return render();
    }

    case 'add-day': collectPlanForm(); s.plan.days.push({ id: uid(), name: `Økt ${String.fromCharCode(65 + s.plan.days.length)}`, exercises: [] }); save(); return render();
    case 'remove-day': if (!confirm('Fjerne denne øktdagen?')) return; collectPlanForm(); s.plan.days.splice(i, 1); save(); return render();
    case 'reset-plan': if (!confirm('Erstatte planen med eksempelplanen?')) return; s.plan = structuredClone(DEFAULT_PLAN); save(); return render();
    case 'export': {
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `treningsdagbok-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      return;
    }
    case 'reset-all':
      if (!confirm('Slette ALLE data? Dette kan ikke angres.')) return;
      resetAll(); toast('Alt slettet'); return setTab('home');
  }
});

function collectPlanForm() {
  const f = $('#planForm');
  if (!f) return;
  const s = S();
  const fd = new FormData(f);
  s.plan.name = fd.get('planName') || s.plan.name;
  s.plan.rowing = fd.get('rowing') || '';
  s.plan.days.forEach((d, i) => {
    d.name = fd.get(`dayName${i}`) || d.name;
    d.exercises = textToExercises(fd.get(`dayEx${i}`) || '');
  });
}

document.addEventListener('input', (e) => {
  const s = S();
  const t = e.target;
  if (t.dataset.set) {
    const [i, j, k] = t.dataset.set.split(':');
    s.draft.exercises[i].sets[j][k] = t.value;
    save();
  } else if (t.dataset.draft) {
    s.draft[t.dataset.draft] = t.value;
    save();
  } else if (t.closest('#rowForm')) {
    updateRowPreview();
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.ui) {
    ui[t.dataset.ui] = t.value; saveUi(); render();
  } else if (t.id === 'importFile' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!data.plan || !Array.isArray(data.workouts)) throw new Error('Ukjent filformat');
      if (!confirm('Erstatte alle data i appen med innholdet i filen?')) return;
      replaceState(data); toast('Data gjenopprettet'); setTab('home');
    } catch (err) { alert('Kunne ikke lese filen: ' + err.message); }
  }
});

function updateRowPreview() {
  const f = $('#rowForm');
  const dist = num(f.distance.value), time = parseTime(f.time.value);
  const el = $('#rowPreview');
  if (dist && isFinite(time) && time > 0) {
    const sp = time / (dist / 500);
    el.textContent = `Splitt ${fmtTime(sp, 1)}/500 m · ca. ${Math.round(wattFromSplit(sp))} W`;
  } else el.textContent = '';
}

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const s = S();
  const fd = Object.fromEntries(new FormData(f));

  switch (f.id) {
    case 'rowForm': {
      const timeSec = parseTime(fd.time);
      const distance = num(fd.distance);
      if (!distance || !isFinite(timeSec) || timeSec <= 0) return toast('Sjekk distanse og tid (f.eks. 21:30)');
      s.rows.push({ id: uid(), date: fd.date || today(), type: fd.type, distance, timeSec, spm: num(fd.spm), watt: num(fd.watt), hr: num(fd.hr), kcal: num(fd.kcal), drag: num(fd.drag), note: fd.note.trim() });
      save(); toast('Roøkt lagret 🚣'); return render();
    }
    case 'bodyForm': {
      const rec = { id: uid(), date: fd.date || today(), note: fd.note.trim() };
      BODY_FIELDS.forEach(([k]) => { rec[k] = num(fd[k]); });
      if (!BODY_FIELDS.some(([k]) => rec[k])) return toast('Fyll inn minst én måling');
      s.body.push(rec); save(); toast('Måling lagret'); return render();
    }
    case 'foodForm':
    case 'mealPlanForm': {
      const item = { meal: fd.meal, desc: fd.desc.trim(), kcal: num(fd.kcal), protein: num(fd.protein), carbs: num(fd.carbs), fat: num(fd.fat) };
      if (f.id === 'foodForm') s.food.push({ id: uid(), date: ui.foodDate, ...item });
      else (s.mealPlan[ui.mealDay] ||= []).push(item);
      save(); toast('Lagt til'); return render();
    }
    case 'coachForm': {
      const q = (fd.q || '').trim();
      if (q) sendToCoach(q);
      return;
    }
    case 'importPlanForm': {
      const txt = (fd.plan || '').trim();
      if (!txt) return toast('Lim inn planen først');
      return sendToCoach(`Her er treningsplanen min. Gjør den om til appens JSON-format (husk JSON-blokken), og gi en kort oppsummering:\n\n${txt}`);
    }
    case 'profileForm':
      Object.assign(s.settings, { name: fd.name.trim(), heightCm: num(fd.heightCm), kcalTarget: num(fd.kcalTarget), proteinTarget: num(fd.proteinTarget), goal: fd.goal.trim() });
      save(); return toast('Lagret');
    case 'apiForm':
      Object.assign(s.settings, { apiKey: fd.apiKey.trim(), model: fd.model, effort: fd.effort });
      save(); return toast('Lagret');
    case 'planForm':
      collectPlanForm(); s.draft = null; save(); return toast('Plan lagret');
  }
});

$('#settingsBtn').addEventListener('click', () => setTab(ui.tab === 'settings' ? 'home' : 'settings'));
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').close(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

setTab(TITLES[ui.tab] ? ui.tab : 'home');
