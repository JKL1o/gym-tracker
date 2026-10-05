// Oberfläche: Tabs umschalten und Inhalte anzeigen.
import { EXERCISES, SESSIONS, WEEK_TYPES, plannedWeek, mondayOf, toISODate } from './plan.js';
import { defaultsFor, parseNumber, validateGym, formatEntry, formatNumber } from './entries.js';
import { loadEntries, saveGymEntry, deleteGymEntry } from './store.js';

const view = document.getElementById('view');
const state = {
  tab: 'eintragen',
  weekType: 'normal', // vorläufig nur Ansicht, wird ab Schritt 4 pro Woche gespeichert
  logDate: toISODate(new Date()),
  logSession: null, // null = Einheit, die laut Plan an logDate dran ist
  editing: null,    // Übung, deren Felder gerade aufgeklappt sind
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

// Eine Zeile der Übersicht. Standard: Werte für heute + Plan, Knöpfe "Erledigt" und "Ändern".
// Nur bei "Ändern" klappen die Eingabefelder auf.
function exerciseRow(sessionId, item, entries) {
  const ex = EXERCISES[item.ex];
  const done = entries.find((e) => e.type === 'gym' && e.exercise === item.ex && e.date === state.logDate);
  const values = done ?? defaultsFor(sessionId, item.ex, entries); // heute erledigt, sonst letztes Mal / Plan
  const editing = state.editing === item.ex;
  const planText = `Plan ${item.sets} × ${item.reps} · ${item.kg}${item.estimate ? ' (geschätzt)' : ''}`;

  function store(v) {
    const entry = { type: 'gym', date: state.logDate, session: sessionId, exercise: item.ex, ...v };
    const errors = validateGym(entry);
    if (errors.length) return errors;
    saveGymEntry(entry);
    state.editing = null;
    render();
    return [];
  }

  const head = h('div', { class: 'row-head' },
    h('div', { class: 'row-text' },
      h('div', { class: 'row-name' }, ex.name),
      h('div', { class: 'row-values' }, formatEntry({ exercise: item.ex, ...values })),
      h('div', { class: 'muted small' }, planText, ex.note ? ` · ${ex.note}` : ''),
    ),
    editing ? null : h('div', { class: 'row-actions' },
      done
        // Nochmal tippen nimmt "Erledigt" zurück
        ? h('button', { class: 'badge-done', title: 'Nochmal tippen = zurücknehmen', onclick: () => { deleteGymEntry(state.logDate, item.ex); render(); } }, 'Erledigt')
        : h('button', { class: 'btn-done', onclick: () => store({ sets: values.sets, reps: values.reps, weight: values.weight }) }, 'Erledigt'),
      h('button', { class: 'btn-link', onclick: () => { state.editing = item.ex; render(); } }, 'Ändern'),
    ),
  );

  if (!editing) return h('div', { class: done ? 'row done' : 'row' }, head);

  // Bearbeiten: Felder mit den aktuellen Werten vorbelegt
  const sets = numberField('Sätze', values.sets, 'numeric');
  const reps = numberField(repsLabel(ex), formatNumber(values.reps), 'decimal');
  const weight = ex.load === 'none' ? null : numberField(WEIGHT_LABEL[ex.load], formatNumber(values.weight), 'decimal');
  const message = h('div', { class: 'error' });

  return h('div', { class: 'row editing' }, head,
    h('div', { class: 'fields' }, sets.el, reps.el, weight?.el),
    message,
    h('div', { class: 'edit-actions' },
      h('button', { class: 'btn-link', onclick: () => { state.editing = null; render(); } }, 'Abbrechen'),
      h('button', {
        class: 'btn-done',
        onclick: () => {
          const errors = store({
            sets: parseNumber(sets.input.value),
            reps: parseNumber(reps.input.value),
            weight: weight ? parseNumber(weight.input.value) : null,
          });
          message.textContent = errors.join(' · ');
        },
      }, 'Speichern'),
    ),
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
      state.editing = null;
      state.logSession = null; // neue Tagesauswahl → wieder die geplante Einheit vorschlagen
      render();
    },
  });

  const sessionSelect = h('select', {
    onchange: (e) => { state.logSession = e.target.value; state.editing = null; render(); },
  }, Object.entries(SESSIONS).map(([id, s]) => {
    const option = h('option', { value: id }, s.name + (id === planned ? ' (laut Plan heute)' : ''));
    option.selected = id === sessionId;
    return option;
  }));

  const session = SESSIONS[sessionId];
  const doneCount = session.items.filter((item) =>
    entries.some((e) => e.type === 'gym' && e.exercise === item.ex && e.date === state.logDate)).length;
  return [
    h('h2', {}, 'Gym-Einheit eintragen'),
    h('p', { class: 'muted' }, 'Fußball und Körpergewicht kommen in Schritt 3.'),
    h('div', { class: 'card fields' },
      h('label', { class: 'field' }, h('span', {}, 'Datum'), dateInput),
      h('label', { class: 'field' }, h('span', {}, 'Einheit'), sessionSelect),
    ),
    session.note ? h('p', { class: 'muted' }, session.note) : null,
    h('div', { class: 'card list' },
      h('div', { class: 'list-head' },
        h('span', {}, session.name),
        h('span', { class: 'muted small' }, `${doneCount} / ${session.items.length} erledigt`),
      ),
      session.items.map((item) => exerciseRow(sessionId, item, entries)),
    ),
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
