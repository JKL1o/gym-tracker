// Oberfläche: Tabs umschalten und Inhalte anzeigen.
import { EXERCISES, SESSIONS, WEEK_TYPES, plannedWeek, mondayOf, toISODate } from './plan.js';
import { defaultsFor, parseNumber, validateGym, formatEntry, formatNumber } from './entries.js';
import { loadEntries, addEntry } from './store.js';

const view = document.getElementById('view');
const state = {
  tab: 'eintragen',
  weekType: 'normal', // vorläufig nur Ansicht, wird ab Schritt 4 pro Woche gespeichert
  logDate: toISODate(new Date()),
  logSession: null, // null = Einheit, die laut Plan an logDate dran ist
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

// Einheit, die laut Wochenvorlage am Datum `iso` geplant ist (oder null).
function plannedSessionOn(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const week = plannedWeek(state.weekType, mondayOf(new Date(y, m - 1, d)));
  return week.find((day) => day.date === iso)?.gym ?? null;
}

// Beschriftung des Wiederholungs-Felds je nach Übung
function repsLabel(ex) {
  const base = { Wdh: 'Wdh.', m: 'Meter', s: 'Sekunden' }[ex.unit];
  return ex.perSide ? `${base} / Seite` : base;
}

// bw: Zusatzgewicht, 0 = nur Körpergewicht
const WEIGHT_LABEL = { kg: 'kg', kg2: 'kg pro Hand', bw: 'Zusatz-kg' };

function numberField(label, value, mode) {
  const input = h('input', { type: 'text', inputmode: mode, value: value ?? '' });
  return { input, el: h('label', { class: 'field' }, h('span', {}, label), input) };
}

// Karte für eine Übung: Planwert, drei Eingabefelder, Speichern, heute schon Eingetragenes.
function exerciseCard(sessionId, item, entries) {
  const ex = EXERCISES[item.ex];
  const d = defaultsFor(sessionId, item.ex, entries);
  const sets = numberField('Sätze', d.sets, 'numeric');
  const reps = numberField(repsLabel(ex), d.reps === null ? '' : formatNumber(d.reps), 'decimal');
  const weight = ex.load === 'none' ? null : numberField(WEIGHT_LABEL[ex.load], formatNumber(d.weight), 'decimal');
  const message = h('div', { class: 'error' });
  const today = entries.filter((e) => e.type === 'gym' && e.exercise === item.ex && e.date === state.logDate);

  function save() {
    const entry = {
      type: 'gym',
      date: state.logDate,
      session: sessionId,
      exercise: item.ex,
      sets: parseNumber(sets.input.value),
      reps: parseNumber(reps.input.value),
      weight: weight ? parseNumber(weight.input.value) : null,
    };
    const errors = validateGym(entry);
    if (errors.length) {
      message.textContent = errors.join(' · ');
      return;
    }
    addEntry(entry);
    render();
  }

  return h('div', { class: 'card' },
    h('div', { class: 'day-head' }, h('span', {}, ex.name)),
    h('div', { class: 'muted' }, `Plan: ${item.sets} × ${item.reps} · ${item.kg}${item.estimate ? ' (Schätzwert)' : ''}`,
      ex.note ? ` · ${ex.note}` : ''),
    h('div', { class: 'fields' }, sets.el, reps.el, weight?.el),
    message,
    h('button', { class: 'primary', onclick: save }, 'Speichern'),
    today.map((e) => h('div', { class: 'saved' }, `Eingetragen: ${formatEntry(e)}`)),
  );
}

function renderLog() {
  const entries = loadEntries();
  const planned = plannedSessionOn(state.logDate);
  const sessionId = state.logSession ?? planned ?? 'oka';

  const dateInput = h('input', {
    type: 'date',
    value: state.logDate,
    onchange: (e) => {
      if (!e.target.value) return;
      state.logDate = e.target.value;
      state.logSession = null; // neue Tagesauswahl → wieder die geplante Einheit vorschlagen
      render();
    },
  });

  const sessionSelect = h('select', {
    onchange: (e) => { state.logSession = e.target.value; render(); },
  }, Object.entries(SESSIONS).map(([id, s]) => {
    const option = h('option', { value: id }, s.name + (id === planned ? ' (laut Plan heute)' : ''));
    option.selected = id === sessionId;
    return option;
  }));

  const session = SESSIONS[sessionId];
  return [
    h('h2', {}, 'Gym-Einheit eintragen'),
    h('p', { class: 'muted' }, 'Fußball und Körpergewicht kommen in Schritt 3.'),
    h('div', { class: 'card fields' },
      h('label', { class: 'field' }, h('span', {}, 'Datum'), dateInput),
      h('label', { class: 'field' }, h('span', {}, 'Einheit'), sessionSelect),
    ),
    session.note ? h('p', { class: 'muted' }, session.note) : null,
    session.items.map((item) => exerciseCard(sessionId, item, entries)),
  ];
}

// Tabs, die erst in späteren Schritten gebaut werden
const COMING = {
  diagramme: 'Diagramme kommen in Schritt 5.',
  daten: 'CSV-Export kommt in Schritt 6, Notion-Import in Schritt 9.',
};

function render() {
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  }
  const content = state.tab === 'woche' ? renderWeek()
    : state.tab === 'eintragen' ? renderLog()
    : h('div', { class: 'card muted' }, COMING[state.tab]);
  // Leere Einträge (null) entfernen – replaceChildren würde sie sonst als Text "null" anzeigen
  view.replaceChildren(...[content].flat(Infinity).filter((node) => node instanceof Node));
}

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => { state.tab = btn.dataset.tab; render(); });
}

render();
