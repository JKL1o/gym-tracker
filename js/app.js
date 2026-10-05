// Oberfläche: Training eintragen, Wochenplan, Daten-Export.
import { EXERCISES, SESSIONS, plannedWeek, mondayOf, toISODate } from './plan.js';
import {
  defaultsFor, parseNumber, validateGym, formatEntry, formatNumber, sessionForDay,
  validateFootball, validateBodyweight, bodyweightHistory, bodyweightChange,
} from './entries.js';
import {
  loadEntries, saveGymEntry, deleteGymEntry, saveDayEntry, deleteDayEntry,
  initStore, onChange, onError, status, signIn, signOut,
} from './store.js';
import { toCSV } from './export.js';

const view = document.getElementById('view');
// "Heute" – wird beim Zurückkehren in die App neu bestimmt (siehe unten), damit eine
// über Nacht offene App am nächsten Tag nicht noch den Vortag zeigt.
let TODAY = toISODate(new Date());
const state = {
  tab: 'training',
  date: TODAY,        // ausgewählter Tag (Training) bzw. Woche, die angezeigt wird
  override: {},       // Datum → selbst gewählte Einheit (z. B. an einem freien Tag)
  choosing: false,    // Einheiten-Auswahl offen
  editing: null,      // Übung, deren Felder gerade aufgeklappt sind
  openDay: null,      // im Wochenplan aufgeklappter Tag
  matchPending: null, // Datum, an dem "Match" angetippt, aber noch nicht gespeichert ist
  error: null,        // Fehlermeldung (Speichern/Anmelden), oben eingeblendet
  footballOther: null, // Datum, an dem auch die nicht geplante Fußball-Art angezeigt wird
};

const DAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Kleines Hilfsmittel zum Erzeugen von HTML-Elementen.
// Text wird immer als Text eingefügt (nie als HTML) – so kann eine Eingabe nie die Seite verändern.
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// "2026-10-05" → "5. Okt."
function shortDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}.`;
}

// "2026-10-05" → "5. Oktober"
function longDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

// Wochenplan der Woche, in der `iso` liegt. Immer die normale Woche (Match Freitag) –
// bei Samstagsmatch entscheidest du selbst und wählst die Einheit über "Andere Einheit".
function weekOf(iso) {
  return { days: plannedWeek('normal', mondayOf(parseISO(iso))) };
}

function shiftDate(days) {
  const d = parseISO(state.date);
  d.setDate(d.getDate() + days);
  state.date = toISODate(d);
  state.editing = null;
  state.choosing = false;
  state.openDay = null;
  render();
}

function weekNav(week) {
  return h('div', { class: 'week-nav' },
    h('button', { class: 'icon-btn', 'aria-label': 'Vorige Woche', onclick: () => shiftDate(-7) }, '‹'),
    h('div', { class: 'week-label' },
      `${shortDate(week.days[0].date)} – ${shortDate(week.days[6].date)}`,
      week.days.some((d) => d.date === TODAY) ? h('span', { class: 'pill' }, 'Diese Woche') : null,
    ),
    h('button', { class: 'icon-btn', 'aria-label': 'Nächste Woche', onclick: () => shiftDate(7) }, '›'),
  );
}

function footballChip(football) {
  if (football === 'match') return h('span', { class: 'chip chip-match' }, 'Match');
  if (football === 'training') return h('span', { class: 'chip' }, 'Fußballtraining');
  return null;
}

// ---------- Training ----------

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

// Eine Übung: Kreis zum Abhaken, Werte für heute, Plan. "Ändern" klappt die Felder auf.
function exerciseRow(sessionId, item, entries) {
  const ex = EXERCISES[item.ex];
  const done = entries.find((e) => e.type === 'gym' && e.exercise === item.ex && e.date === state.date);
  const values = done ?? defaultsFor(sessionId, item.ex, entries); // heute erledigt, sonst letztes Mal / Plan
  const editing = state.editing === item.ex;

  function store(v) {
    const entry = { type: 'gym', date: state.date, session: sessionId, exercise: item.ex, ...v };
    const errors = validateGym(entry);
    if (errors.length) return errors;
    saveGymEntry(entry);
    state.editing = null;
    render();
    return [];
  }

  function toggleDone() {
    if (done) deleteGymEntry(state.date, item.ex);
    else store({ sets: values.sets, reps: values.reps, weight: values.weight });
    render();
  }

  const row = h('div', { class: `row${done ? ' done' : ''}${editing ? ' editing' : ''}` },
    h('div', { class: 'row-main' },
      h('button', {
        class: `check${done ? ' checked' : ''}`,
        'aria-label': done ? 'Erledigt zurücknehmen' : 'Als erledigt markieren',
        onclick: toggleDone,
      }),
      h('div', { class: 'row-text' },
        h('div', { class: 'row-name' }, ex.name),
        h('div', { class: 'row-values' }, formatEntry({ exercise: item.ex, ...values })),
        h('div', { class: 'row-plan' }, `Plan ${item.sets} × ${item.reps} · ${item.kg}`,
          item.estimate ? ' (geschätzt)' : '', ex.note ? ` · ${ex.note}` : ''),
      ),
      editing ? null : h('button', { class: 'btn-text', onclick: () => { state.editing = item.ex; render(); } }, 'Ändern'),
    ),
  );
  if (!editing) return row;

  const sets = numberField('Sätze', values.sets, 'numeric');
  const reps = numberField(repsLabel(ex), formatNumber(values.reps), 'decimal');
  const weight = ex.load === 'none' ? null : numberField(WEIGHT_LABEL[ex.load], formatNumber(values.weight), 'decimal');
  const message = h('div', { class: 'error' });
  row.append(
    h('div', { class: 'edit' },
      h('div', { class: 'fields' }, sets.el, reps.el, weight?.el),
      message,
      h('div', { class: 'edit-actions' },
        h('button', { class: 'btn-secondary', onclick: () => { state.editing = null; render(); } }, 'Abbrechen'),
        h('button', {
          class: 'btn-primary',
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
    ),
  );
  return row;
}

function sessionChooser(day) {
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Welche Einheit?'),
    h('div', { class: 'choice-list' },
      Object.entries(SESSIONS).map(([id, s]) => h('button', {
        class: 'choice',
        onclick: () => { state.override[state.date] = id; state.choosing = false; render(); },
      }, h('span', {}, s.name), id === day.gym ? h('span', { class: 'muted' }, 'laut Plan') : null)),
    ),
    h('button', { class: 'btn-secondary full', onclick: () => { state.choosing = false; render(); } }, 'Abbrechen'),
  );
}

// Fußball an diesem Tag – gleiche Bedienung wie bei den Übungen: Kreis antippen = gemacht.
// Angezeigt wird, was laut Plan dran ist (Training oder Match). An freien Tagen oder wenn es
// anders kam, lässt sich die andere Art über den kleinen Link darunter eintragen.
function footballRow(kind, entry) {
  const done = entry?.kind === kind;
  const editing = kind === 'match' && state.matchPending === state.date;

  function toggle() {
    if (done) {
      deleteDayEntry('football', state.date);
    } else if (kind === 'training') {
      saveDayEntry({ type: 'football', date: state.date, kind: 'training', minutes: null });
    } else {
      state.matchPending = state.date; // bei Match zuerst die Spielminuten abfragen
    }
    render();
  }

  const row = h('div', { class: `row${done ? ' done' : ''}${editing ? ' editing' : ''}` },
    h('div', { class: 'row-main' },
      h('button', {
        class: `check${done ? ' checked' : ''}`,
        'aria-label': done ? 'Zurücknehmen' : 'Als gemacht markieren',
        onclick: toggle,
      }),
      h('div', { class: 'row-text' },
        h('div', { class: 'row-name' }, kind === 'match' ? 'Match' : 'Fußballtraining'),
        done && kind === 'match' ? h('div', { class: 'row-values' }, `${entry.minutes} Spielminuten`) : null,
      ),
      done && kind === 'match' && !editing
        ? h('button', { class: 'btn-text', onclick: () => { state.matchPending = state.date; render(); } }, 'Ändern')
        : null,
    ),
  );
  if (!editing) return row;

  const minutes = h('input', { type: 'text', inputmode: 'numeric', value: done ? entry.minutes : '', placeholder: 'z. B. 70' });
  const message = h('div', { class: 'error' });
  row.append(h('div', { class: 'edit' },
    h('div', { class: 'fields' }, h('label', { class: 'field' }, h('span', {}, 'Spielminuten'), minutes)),
    message,
    h('div', { class: 'edit-actions' },
      h('button', { class: 'btn-secondary', onclick: () => { state.matchPending = null; render(); } }, 'Abbrechen'),
      h('button', {
        class: 'btn-primary',
        onclick: () => {
          const newEntry = { type: 'football', date: state.date, kind: 'match', minutes: parseNumber(minutes.value) };
          const errors = validateFootball(newEntry);
          if (errors.length) {
            message.textContent = errors.join(' · ');
            return;
          }
          saveDayEntry(newEntry);
          state.matchPending = null;
          render();
        },
      }, 'Speichern'),
    ),
  ));
  return row;
}

function footballCard(day, entries) {
  const entry = entries.find((e) => e.type === 'football' && e.date === state.date);
  const showOther = state.footballOther === state.date;
  // Welche Zeilen? Eingetragenes zuerst, sonst laut Plan; "andere Art" nur auf Wunsch
  const kinds = [];
  const main = entry?.kind ?? day.football;
  if (main) kinds.push(main);
  if (showOther || !main) {
    for (const k of ['training', 'match']) if (!kinds.includes(k)) kinds.push(k);
  }
  const other = main === 'training' ? 'Match' : 'Training';

  return [
    !main && !showOther
      ? h('button', { class: 'btn-text center', onclick: () => { state.footballOther = state.date; render(); } }, 'Fußball eintragen')
      : h('div', { class: 'card list' }, kinds.map((k) => footballRow(k, entry))),
    main && !showOther && !entry
      ? h('button', { class: 'btn-text center', onclick: () => { state.footballOther = state.date; render(); } }, `Stattdessen ${other} eintragen`)
      : null,
    // Versehentlich aufgeklappt? Zusätzliche Zeile wieder ausblenden (solange dort nichts eingetragen ist)
    showOther && !entry
      ? h('button', {
        class: 'btn-text center',
        onclick: () => { state.footballOther = null; state.matchPending = null; render(); },
      }, main ? `${other} ausblenden` : 'Ausblenden')
      : null,
  ];
}

function renderTraining() {
  const week = weekOf(state.date);
  const entries = loadEntries();
  const index = week.days.findIndex((d) => d.date === state.date);
  const day = week.days[index];
  const sessionId = sessionForDay({ date: state.date, planned: day.gym, override: state.override[state.date], entries });
  const date = parseISO(state.date);

  // Tagesleiste Mo–So; Punkt = Gym geplant, grün = etwas eingetragen
  const strip = h('div', { class: 'day-strip' }, week.days.map((d) => {
    const logged = entries.some((e) => (e.type === 'gym' || e.type === 'football') && e.date === d.date);
    const cls = ['day', d.date === state.date && 'selected', d.date === TODAY && 'today'].filter(Boolean).join(' ');
    return h('button', {
      class: cls,
      onclick: () => { state.date = d.date; state.editing = null; state.choosing = false; render(); },
    },
    h('span', { class: 'day-name' }, d.dayName),
    h('span', { class: 'day-num' }, parseISO(d.date).getDate()),
    h('span', { class: `dot${logged ? ' logged' : d.gym ? '' : ' none'}` }));
  }));

  const header = h('div', { class: 'day-header' },
    h('div', { class: 'overline' }, `${DAY_LONG[index]}, ${date.getDate()}. ${MONTHS[date.getMonth()]}`),
    h('div', { class: 'day-title' }, sessionId ? SESSIONS[sessionId].name : 'Kein Gym'),
    h('div', { class: 'chips' },
      footballChip(day.football),
      sessionId && sessionId !== day.gym ? h('span', { class: 'chip chip-muted' }, 'nicht laut Plan') : null,
    ),
  );

  const parts = [weekNav(week), strip, header];

  if (state.choosing) {
    parts.push(sessionChooser(day));
  } else if (!sessionId) {
    parts.push(h('div', { class: 'card empty' },
      h('p', {}, day.football === 'match' ? 'Matchtag – laut Plan kein Gym.' : 'Laut Plan frei.'),
      h('button', { class: 'btn-secondary', onclick: () => { state.choosing = true; render(); } }, 'Trotzdem Einheit eintragen'),
    ));
  } else {
    const session = SESSIONS[sessionId];
    const doneCount = session.items.filter((item) =>
      entries.some((e) => e.type === 'gym' && e.exercise === item.ex && e.date === state.date)).length;
    parts.push(
      h('div', { class: 'progress-line' },
        h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${(doneCount / session.items.length) * 100}%` })),
        h('span', { class: 'muted' }, `${doneCount} / ${session.items.length}`),
      ),
      session.note ? h('div', { class: 'note' }, session.note) : null,
      h('div', { class: 'card list' }, session.items.map((item) => exerciseRow(sessionId, item, entries))),
      h('button', { class: 'btn-text center', onclick: () => { state.choosing = true; render(); } }, 'Andere Einheit wählen'),
    );
  }
  parts.push(h('div', { class: 'gap' }), footballCard(day, entries));
  return parts;
}

// ---------- Woche ----------

function renderWeek() {
  const week = weekOf(state.date);

  const list = h('div', { class: 'card list' }, week.days.map((d, i) => {
    const open = state.openDay === d.date;
    const session = d.gym ? SESSIONS[d.gym] : null;
    return h('div', { class: `week-row${d.date === TODAY ? ' today' : ''}` },
      h('button', {
        class: 'week-row-main',
        onclick: () => { state.openDay = open ? null : d.date; render(); },
        disabled: session ? null : 'disabled',
      },
      h('div', { class: 'week-day' }, h('span', { class: 'day-name' }, d.dayName), h('span', {}, parseISO(d.date).getDate())),
      h('div', { class: 'week-content' },
        h('div', { class: session ? 'row-name' : 'muted' }, session ? session.name : (d.football ? 'Kein Gym' : 'Frei')),
        h('div', { class: 'chips' }, footballChip(d.football)),
      ),
      session ? h('span', { class: `chevron${open ? ' open' : ''}` }, '›') : null),
      open ? h('div', { class: 'plan-list' },
        session.items.map((item) => h('div', { class: 'plan-item' },
          h('span', {}, EXERCISES[item.ex].name),
          h('span', { class: 'muted' }, `${item.sets} × ${item.reps} · ${item.kg}`),
        )),
        session.note ? h('div', { class: 'note' }, session.note) : null,
      ) : null,
    );
  }));

  return [
    weekNav(week),
    list,
  ];
}

// ---------- Daten ----------

function downloadCSV(entries) {
  // \uFEFF (BOM) am Anfang, damit Excel die Datei als UTF-8 erkennt
  const blob = new Blob(['\uFEFF' + toCSV(entries)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `gym-tracker-${TODAY}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bodyweightCard(entries) {
  const history = bodyweightHistory(entries);
  const latest = history[0];
  const change = bodyweightChange(entries);

  const dateInput = h('input', { type: 'date', value: TODAY, max: TODAY });
  const kgInput = h('input', { type: 'text', inputmode: 'decimal', placeholder: latest ? formatNumber(latest.kg) : 'z. B. 68,5' });
  const message = h('div', { class: 'error' });

  function save() {
    const entry = { type: 'bodyweight', date: dateInput.value, kg: parseNumber(kgInput.value) };
    const errors = validateBodyweight(entry, TODAY);
    if (errors.length) {
      message.textContent = errors.join(' · ');
      return;
    }
    saveDayEntry(entry); // gleicher Tag nochmal = Wert wird ersetzt
    render();
  }

  // Ziel Zunehmen: Plus grün, Minus rot
  const delta = change === null ? null : h('span', {
    class: `delta${change > 0 ? ' up' : change < 0 ? ' down' : ''}`,
  }, `${change > 0 ? '+' : ''}${formatNumber(change)} kg`);

  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Körpergewicht'),
    latest
      ? [
        h('div', { class: 'big-value' }, h('span', { class: 'stat-num' }, `${formatNumber(latest.kg)} kg`), delta),
        h('div', { class: 'muted' }, `Zuletzt gemessen am ${longDate(latest.date)}`,
          change === null ? '' : ' · Veränderung zur Messung davor'),
      ]
      : h('p', { class: 'muted' }, 'Noch keine Messung eingetragen.'),
    h('div', { class: 'fields top-gap' },
      h('label', { class: 'field' }, h('span', {}, 'Datum'), dateInput),
      h('label', { class: 'field' }, h('span', {}, 'Gewicht in kg'), kgInput),
    ),
    message,
    h('button', { class: 'btn-primary full', onclick: save }, 'Gewicht speichern'),
    history.length ? [
      h('div', { class: 'section-label' }, 'Verlauf'),
      h('div', { class: 'history' }, history.slice(0, 10).map((e) => h('div', { class: 'history-row' },
        h('span', {}, longDate(e.date)),
        h('span', { class: 'history-kg' }, `${formatNumber(e.kg)} kg`),
        h('button', { class: 'btn-text muted-link', onclick: () => { deleteDayEntry('bodyweight', e.date); render(); } }, 'Entfernen'),
      ))),
    ] : null,
  );
}

function renderData() {
  const entries = loadEntries();
  const count = (type) => entries.filter((e) => e.type === type).length;
  return [
    h('h1', { class: 'page-title' }, 'Daten'),
    bodyweightCard(entries),
    h('div', { class: 'card' },
      h('div', { class: 'card-title' }, 'Export'),
      h('p', { class: 'muted' }, 'Alle Einträge als CSV-Datei – öffnet sich in Excel und dient als Sicherung.'),
      h('div', { class: 'stats' },
        h('div', {}, h('div', { class: 'stat-num small-num' }, count('gym')), h('div', { class: 'muted' }, 'Gym-Übungen')),
        h('div', {}, h('div', { class: 'stat-num small-num' }, count('football')), h('div', { class: 'muted' }, 'Fußball')),
        h('div', {}, h('div', { class: 'stat-num small-num' }, count('bodyweight')), h('div', { class: 'muted' }, 'Messungen')),
      ),
      h('button', { class: 'btn-secondary full', onclick: () => downloadCSV(entries), disabled: entries.length ? null : 'disabled' },
        'CSV herunterladen'),
    ),
    h('div', { class: 'card account' },
      h('div', {},
        h('div', { class: 'card-title' }, 'Konto'),
        h('div', { class: 'muted' }, status().user?.email ?? ''),
      ),
      h('button', { class: 'btn-text', onclick: () => signOut() }, 'Abmelden'),
    ),
  ];
}

// ---------- Anmeldung ----------

function renderGate(title, text, button) {
  return h('div', { class: 'gate' },
    h('img', { src: 'icons/icon-192.png', alt: '', class: 'gate-icon' }),
    h('h1', { class: 'page-title' }, title),
    text ? h('p', { class: 'muted' }, text) : null,
    button,
  );
}

// ---------- Rahmen ----------

function renderContent() {
  const st = status();
  if (!st.configured) {
    return renderGate('Firebase fehlt', 'In js/firebase-config.js sind noch keine Zugangsdaten eingetragen.', null);
  }
  if (!st.authChecked || (st.user && !st.dataLoaded)) return renderGate('Gym-Tracker', 'Lädt …', null);
  if (!st.user) {
    return renderGate('Gym-Tracker', 'Melde dich mit deinem Google-Konto an. Deine Daten sind dann auf Handy und PC gleich.',
      h('button', { class: 'btn-primary', onclick: () => signIn() }, 'Mit Google anmelden'));
  }
  return state.tab === 'woche' ? renderWeek()
    : state.tab === 'daten' ? renderData()
    : renderTraining();
}

function render() {
  const loggedIn = Boolean(status().user && status().dataLoaded);
  document.getElementById('tabs').hidden = !loggedIn; // Navigation erst nach dem Anmelden
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  }
  const banner = state.error
    ? h('div', { class: 'banner' }, h('span', {}, state.error),
      h('button', { class: 'btn-text', onclick: () => { state.error = null; render(); } }, 'OK'))
    : null;
  // Leere Einträge (null) entfernen – replaceChildren würde sie sonst als Text "null" anzeigen
  view.replaceChildren(...[banner, renderContent()].flat(Infinity).filter((node) => node instanceof Node));
}

// Änderungen aus der Datenbank (auch vom anderen Gerät) neu zeichnen – aber nicht, während
// gerade in ein Feld getippt wird; dann erst, wenn das Feld verlassen wird.
let renderPending = false;
function renderSoon() {
  if (document.activeElement?.tagName === 'INPUT' && view.contains(document.activeElement)) {
    renderPending = true;
    return;
  }
  render();
}
view.addEventListener('focusout', () => {
  if (renderPending) {
    renderPending = false;
    setTimeout(renderSoon, 0); // nach dem Klick auf "Speichern" etc.
  }
});

// Neuer Tag seit dem letzten Öffnen? Dann "heute" weiterschalten.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = toISODate(new Date());
  if (now === TODAY) return;
  if (state.date === TODAY) state.date = now;
  TODAY = now;
  render();
});

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => {
    state.tab = btn.dataset.tab;
    state.editing = null;
    state.choosing = false;
    render();
    window.scrollTo(0, 0);
  });
}

onChange(renderSoon);
onError((message) => { state.error = message; render(); });
initStore();
render();

// Offline-Fähigkeit: Service Worker registrieren
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker:', err));
}
