// CSV-Export aller Einträge. Format für Excel mit deutscher Einstellung:
// Semikolon als Trennzeichen, Dezimalkomma, UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch).
import { EXERCISES, SESSIONS } from './plan.js';

const COLUMNS = ['datum', 'art', 'einheit', 'uebung', 'saetze', 'wiederholungen', 'wdh_einheit', 'gewicht_kg', 'gewicht_art'];
const WEIGHT_TYPE = { kg: 'gesamt', kg2: 'pro Hand', bw: 'Zusatzgewicht', none: 'ohne' };
const REPS_UNIT = { Wdh: 'Wdh', m: 'm', s: 's' };

// Ein Feld: Zahlen mit Komma; Text mit ; " oder Zeilenumbruch in Anführungszeichen
function cell(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'number' ? String(value).replace('.', ',') : String(value);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function gymRow(e) {
  const ex = EXERCISES[e.exercise];
  return [
    e.date, 'gym', SESSIONS[e.session]?.name ?? e.session, ex?.name ?? e.exercise,
    e.sets, e.reps, ex ? REPS_UNIT[ex.unit] + (ex.perSide ? ' / Seite' : '') : '',
    e.weight, ex ? WEIGHT_TYPE[ex.load] : '',
  ];
}

// Alle Einträge → CSV-Text, nach Datum sortiert (ohne BOM; das hängt der Download davor)
export function toCSV(entries) {
  const sorted = [...entries].sort((a, b) => (a.date + (a.createdAt ?? '')).localeCompare(b.date + (b.createdAt ?? '')));
  const rows = sorted.map((e) => (e.type === 'gym' ? gymRow(e) : [e.date, e.type]));
  return [COLUMNS, ...rows].map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n';
}
