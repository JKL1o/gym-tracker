// Diagramme als SVG (ohne Zusatzbibliothek, funktioniert offline).
// Linie: 2px, Punkte r=4 mit 2px Ring in Hintergrundfarbe, Wert am Ende beschriftet.
// Säulen: max. 24px breit, oben 4px abgerundet, 2px Abstand zwischen Nachbarn.
// Antippen / Maus drüber zeigt einen Tooltip mit den genauen Werten.
import { niceTicks } from './charts-data.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340;   // Zeichenfläche (viewBox); skaliert auf die Kartenbreite
const H = 200;
const PAD = { top: 18, right: 46, bottom: 26, left: 40 };
const MONTHS = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

const num = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const dayLabel = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d}. ${MONTHS[m - 1]}`; };
const dayNumber = (iso) => Date.UTC(...iso.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) / 86400000;

// Rahmen: Container mit Tooltip-Ebene (absolut positioniert über dem SVG)
function frame(root) {
  const wrap = document.createElement('div');
  wrap.className = 'chart';
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  wrap.append(root, tip);
  return { wrap, tip };
}

function showTip(wrap, tip, svgX, svgY, lines) {
  tip.replaceChildren(...lines.map((t, i) => {
    const el = document.createElement('div');
    el.textContent = t;
    if (i === 0) el.className = 'chart-tip-title';
    return el;
  }));
  tip.hidden = false;
  // SVG-Koordinaten → Pixel im Container
  const scale = wrap.clientWidth / W;
  const x = svgX * scale;
  const left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), wrap.clientWidth - tip.offsetWidth);
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(svgY * scale - tip.offsetHeight - 10, 0)}px`;
}

// Liniendiagramm. points: [{ date, value, ... }]; unit: "kg"; tipLines(p) → zusätzliche Tooltip-Zeilen
export function lineChart(points, { unit = 'kg', color = 'var(--series-1)', tipLines = () => [] } = {}) {
  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks.at(-1);
  const d0 = dayNumber(points[0].date);
  const d1 = dayNumber(points.at(-1).date);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (p) => (d1 === d0 ? PAD.left + innerW / 2 : PAD.left + ((dayNumber(p.date) - d0) / (d1 - d0)) * innerW);
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const grid = ticks.map((t) => [
    svg('line', { x1: PAD.left, x2: W - PAD.right, y1: y(t), y2: y(t), class: 'chart-grid' }),
    svg('text', { x: PAD.left - 6, y: y(t) + 4, class: 'chart-axis', 'text-anchor': 'end' }, num(t)),
  ]);
  // Datumsachse: erster und letzter Tag (bei mehr Punkten auch die Mitte)
  const xLabels = [points[0]];
  if (points.length > 2) xLabels.push(points[Math.floor(points.length / 2)]);
  if (points.length > 1) xLabels.push(points.at(-1));
  const xAxis = xLabels.map((p, i) => svg('text', {
    x: x(p), y: H - 6, class: 'chart-axis',
    'text-anchor': points.length === 1 ? 'middle' : i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle',
  }, dayLabel(p.date)));

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points.at(-1);
  const crosshair = svg('line', { y1: PAD.top, y2: PAD.top + innerH, class: 'chart-cross', visibility: 'hidden' });
  const focus = svg('circle', { r: 6, class: 'chart-dot-focus', fill: color, visibility: 'hidden' });

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img' },
    grid,
    svg('line', { x1: PAD.left, x2: W - PAD.right, y1: PAD.top + innerH, y2: PAD.top + innerH, class: 'chart-base' }),
    xAxis,
    points.length > 1 ? svg('path', { d: path, class: 'chart-line', stroke: color }) : null,
    points.map((p) => svg('circle', { cx: x(p), cy: y(p.value), r: 4, class: 'chart-dot', fill: color })),
    // Wert am Ende der Linie
    svg('text', { x: x(last) + 8, y: y(last.value) + 4, class: 'chart-end-label' }, `${num(last.value)} ${unit}`),
    crosshair, focus,
    // Unsichtbare Fläche für Maus/Finger (größer als die Punkte)
    svg('rect', { x: PAD.left - 10, y: 0, width: innerW + 20, height: H, fill: 'transparent', class: 'chart-hit' }),
  );

  const { wrap, tip } = frame(root);
  const hit = root.querySelector('.chart-hit');
  function nearest(evt) {
    const rect = root.getBoundingClientRect();
    const svgX = ((evt.clientX - rect.left) / rect.width) * W;
    return points.reduce((best, p) => (Math.abs(x(p) - svgX) < Math.abs(x(best) - svgX) ? p : best), points[0]);
  }
  function move(evt) {
    const p = nearest(evt);
    crosshair.setAttribute('x1', x(p));
    crosshair.setAttribute('x2', x(p));
    crosshair.setAttribute('visibility', 'visible');
    focus.setAttribute('cx', x(p));
    focus.setAttribute('cy', y(p.value));
    focus.setAttribute('visibility', 'visible');
    showTip(wrap, tip, x(p), y(p.value), [dayLabel(p.date), `${num(p.value)} ${unit}`, ...tipLines(p)]);
  }
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move); // Antippen am Handy
  hit.addEventListener('pointerleave', (evt) => {
    if (evt.pointerType === 'touch') return; // am Handy bleibt der Tooltip nach dem Antippen stehen
    crosshair.setAttribute('visibility', 'hidden');
    focus.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  });
  return wrap;
}

// Gruppiertes Säulendiagramm. groups: [{ label, values: [n, n] }]; series: [{ name, color }]
export function columnChart(groups, series) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const ticks = niceTicks(0, max).filter((t) => t >= 0 && Number.isInteger(t));
  const yMax = ticks.at(-1);
  const pad = { ...PAD, right: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const band = innerW / groups.length;
  const barW = Math.min(14, (band - 8) / series.length - 2);
  const y = (v) => pad.top + (1 - v / yMax) * innerH;
  const base = pad.top + innerH;

  // Säule mit abgerundeter Oberkante (4px), unten gerade auf der Grundlinie
  function bar(x0, v, color) {
    if (v <= 0) return null;
    const top = y(v);
    const r = Math.min(4, (base - top) / 2, barW / 2);
    const d = `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${base} Z`;
    return svg('path', { d, fill: color, class: 'chart-bar' });
  }

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img' },
    ticks.map((t) => [
      svg('line', { x1: pad.left, x2: W - pad.right, y1: y(t), y2: y(t), class: 'chart-grid' }),
      svg('text', { x: pad.left - 6, y: y(t) + 4, class: 'chart-axis', 'text-anchor': 'end' }, t),
    ]),
    svg('line', { x1: pad.left, x2: W - pad.right, y1: base, y2: base, class: 'chart-base' }),
    groups.map((g, gi) => {
      const groupW = series.length * barW + (series.length - 1) * 2;
      const x0 = pad.left + gi * band + (band - groupW) / 2;
      return [
        series.map((s, si) => bar(x0 + si * (barW + 2), g.values[si], s.color)),
        svg('text', { x: pad.left + gi * band + band / 2, y: H - 6, class: 'chart-axis', 'text-anchor': 'middle' }, g.label),
        svg('rect', { x: pad.left + gi * band, y: 0, width: band, height: H, fill: 'transparent', class: 'chart-hit', 'data-i': gi }),
      ];
    }),
  );

  const { wrap, tip } = frame(root);
  root.querySelectorAll('.chart-hit').forEach((rect) => {
    const show = () => {
      const g = groups[Number(rect.dataset.i)];
      const top = y(Math.max(...g.values, 0));
      showTip(wrap, tip, pad.left + Number(rect.dataset.i) * band + band / 2, top,
        [g.title ?? g.label, ...series.map((s, si) => `${s.name}: ${g.values[si]}`)]);
    };
    rect.addEventListener('pointermove', show);
    rect.addEventListener('pointerdown', show);
    rect.addEventListener('pointerleave', (evt) => { if (evt.pointerType !== 'touch') tip.hidden = true; });
  });
  return wrap;
}
