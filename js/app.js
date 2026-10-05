// Oberfläche: Tabs umschalten und Inhalte anzeigen.
import { EXERCISES, SESSIONS, WEEK_TYPES, plannedWeek, mondayOf } from './plan.js';

const view = document.getElementById('view');
const state = {
  tab: 'woche',
  weekType: 'normal', // Schritt 1: nur Ansicht, wird ab Schritt 4 pro Woche gespeichert
};

// Kleines Hilfsmittel zum Erzeugen von HTML-Elementen.
// Text wird immer als Text eingefügt (nie als HTML) – so kann eine Eingabe nie die Seite verändern.
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// "2026-10-05" → "05.10."
function shortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function sessionTable(sessionId) {
  const session = SESSIONS[sessionId];
  return h('details', {},
    h('summary', {}, `Gym: ${session.name}`),
    h('table', {},
      h('tr', {}, h('th', {}, 'Übung'), h('th', {}, 'Sätze × Wdh.'), h('th', {}, 'kg')),
      session.items.map((item) => {
        const ex = EXERCISES[item.ex];
        return h('tr', {},
          h('td', {}, ex.name, ex.note ? h('div', { class: 'muted' }, ex.note) : null),
          h('td', {}, `${item.sets} × ${item.reps}`),
          h('td', {}, item.kg + (item.estimate ? ' *' : '')),
        );
      }),
    ),
    session.note ? h('p', { class: 'muted' }, session.note) : null,
    session.items.some((i) => i.estimate) ? h('p', { class: 'muted' }, '* Schätzwert laut Plan') : null,
  );
}

function renderWeek() {
  const monday = mondayOf(new Date());
  const days = plannedWeek(state.weekType, monday);

  const toggle = h('div', { class: 'toggle' },
    Object.entries(WEEK_TYPES).map(([key, type]) =>
      h('button', {
        class: key === state.weekType ? 'active' : '',
        onclick: () => { state.weekType = key; render(); },
      }, type.label),
    ),
  );

  return [
    h('h2', {}, `Woche ${shortDate(days[0].date)} – ${shortDate(days[6].date)}`),
    h('p', { class: 'muted' }, 'Geplant laut Gym.md. "Gemacht / ausgefallen" kommt in Schritt 4.'),
    toggle,
    days.map((day) => h('div', { class: 'card' },
      h('div', { class: 'day-head' }, h('span', {}, `${day.dayName} ${shortDate(day.date)}`)),
      day.gym ? sessionTable(day.gym) : null,
      day.football === 'training' ? h('div', { class: 'day-line' }, 'Fußball: Training') : null,
      day.football === 'match' ? h('div', { class: 'day-line tag-match' }, 'Fußball: Match') : null,
      !day.gym && !day.football ? h('div', { class: 'day-line muted' }, 'frei') : null,
    )),
  ];
}

// Tabs, die erst in späteren Schritten gebaut werden
const COMING = {
  eintragen: 'Eintragen kommt in Schritt 2 (Gym) und 3 (Fußball, Körpergewicht).',
  diagramme: 'Diagramme kommen in Schritt 5.',
  daten: 'CSV-Export kommt in Schritt 6, Notion-Import in Schritt 9.',
};

function render() {
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  }
  const content = state.tab === 'woche'
    ? renderWeek()
    : h('div', { class: 'card muted' }, COMING[state.tab]);
  view.replaceChildren(...[content].flat(Infinity));
}

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => { state.tab = btn.dataset.tab; render(); });
}

render();
