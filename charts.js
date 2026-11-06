// Små SVG-grafer uten eksterne biblioteker (fungerer offline).

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Linjegraf.
 * points: [{ x: 'YYYY-MM-DD', y: number }]
 * opts: { invert: bool (lavere er bedre, f.eks. splitt), fmt: (y) => string, unit }
 */
export function lineChart(points, opts = {}) {
  const pts = points.filter((p) => isFinite(p.y));
  if (pts.length < 2) return `<div class="empty">${pts.length ? 'Trenger minst to målinger for å vise graf.' : 'Ingen data ennå.'}</div>`;
  const W = 600, H = 240, L = 66, R = 14, T = 16, B = 34;
  const fmt = opts.fmt || ((v) => (Math.round(v * 10) / 10).toString().replace('.', ','));
  const xs = pts.map((p) => new Date(p.x + 'T12:00:00').getTime());
  const ys = pts.map((p) => p.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  if (minX === maxX) { minX -= 86400000; maxX += 86400000; }
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = (maxY - minY) * 0.12 || Math.abs(maxY) * 0.05 || 1;
  minY -= pad; maxY += pad;
  const sx = (x) => L + ((x - minX) / (maxX - minX)) * (W - L - R);
  const sy = (y) => opts.invert
    ? T + ((y - minY) / (maxY - minY)) * (H - T - B)
    : H - B - ((y - minY) / (maxY - minY)) * (H - T - B);

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = minY + ((maxY - minY) * i) / 4;
    const y = sy(v);
    grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  const labelIdx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const xl = labelIdx.map((i) => {
    const d = new Date(pts[i].x + 'T12:00:00');
    const anchor = i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle';
    return `<text x="${sx(xs[i])}" y="${H - 8}" text-anchor="${anchor}">${d.getDate()}.${d.getMonth() + 1}</text>`;
  }).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => `<circle class="dot" cx="${sx(xs[i])}" cy="${sy(p.y)}" r="5"><title>${esc(p.x)}: ${esc(fmt(p.y))}${opts.unit ? ' ' + esc(opts.unit) : ''}</title></circle>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'graf')}">${grid}${xl}<path class="line" d="${path}"/>${dots}</svg>`;
}

/** Søylediagram. bars: [{ label, value }] */
export function barChart(bars, opts = {}) {
  if (!bars.length || bars.every((b) => !b.value)) return '<div class="empty">Ingen data ennå.</div>';
  const W = 600, H = 220, L = 56, R = 8, T = 14, B = 34;
  const max = Math.max(...bars.map((b) => b.value)) * 1.1 || 1;
  const bw = (W - L - R) / bars.length;
  const fmt = opts.fmt || ((v) => Math.round(v));
  let out = '';
  for (let i = 0; i <= 3; i++) {
    const v = (max * i) / 3, y = H - B - (v / max) * (H - T - B);
    out += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  bars.forEach((b, i) => {
    const h = (b.value / max) * (H - T - B);
    const x = L + i * bw + bw * 0.15;
    out += `<rect class="bar" x="${x}" y="${H - B - h}" width="${bw * 0.7}" height="${h}" rx="3"><title>${esc(b.label)}: ${esc(fmt(b.value))}</title></rect>`;
    out += `<text x="${x + bw * 0.35}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'søylediagram')}">${out}</svg>`;
}
