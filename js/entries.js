// Rechen- und Prüflogik für Einträge – ohne Browser-Abhängigkeit, damit sie automatisch testbar ist.
import { EXERCISES, SESSIONS } from './plan.js';

// Planwert Gewicht → Zahl in kg.
// "+2,5 kg" → 2.5 · "2 × 14 kg" → 14 (pro Hand) · "40 kg" → 40 · "KG" → 0 · "—" / "Band" → null
export function parsePlanWeight(text) {
  if (text === 'KG') return 0;
  const m = text.match(/(\d+(?:,\d+)?)\s*kg/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

// Planwert Sätze → Zahl. "4" → 4 · "1 + 3" (Topsatz + 3 Sätze) → 4
export function parsePlanSets(text) {
  return text.split('+').reduce((sum, part) => sum + Number(part.trim()), 0);
}

// Planwert Wiederholungen → untere Grenze. "8–12" → 8 · "40 m" → 40 · "30 s / Seite" → 30
export function parsePlanReps(text) {
  return Number(text.match(/\d+/)[0]);
}

// Benutzereingabe → Zahl. Akzeptiert Komma und Punkt. Leer → null, Unsinn → NaN.
export function parseNumber(input) {
  const s = String(input ?? '').trim().replace(',', '.');
  if (s === '') return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

// Zahl → deutsche Schreibweise. 2.5 → "2,5"
export function formatNumber(n) {
  return String(n).replace('.', ',');
}

// Letzter Gym-Eintrag einer Übung (nach Datum, bei gleichem Datum nach Speicherzeit).
export function lastEntryFor(entries, exerciseId) {
  const matching = entries.filter((e) => e.type === 'gym' && e.exercise === exerciseId);
  matching.sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
  return matching.at(-1) ?? null;
}

// Vorbelegung fürs Formular: Werte vom letzten Mal, sonst Planwerte der Einheit.
export function defaultsFor(sessionId, exerciseId, entries) {
  const last = lastEntryFor(entries, exerciseId);
  if (last) return { sets: last.sets, reps: last.reps, weight: last.weight };
  const item = SESSIONS[sessionId].items.find((i) => i.ex === exerciseId);
  const weight = EXERCISES[exerciseId].load === 'none' ? null : parsePlanWeight(item.kg);
  return { sets: parsePlanSets(item.sets), reps: parsePlanReps(item.reps), weight };
}

// Prüft einen Gym-Eintrag. Gibt eine Liste von Fehlermeldungen zurück (leer = in Ordnung).
export function validateGym(entry) {
  const errors = [];
  const ex = EXERCISES[entry.exercise];
  if (!ex) return ['Unbekannte Übung'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? '')) errors.push('Datum fehlt');
  if (!Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > 20) errors.push('Sätze: ganze Zahl von 1 bis 20');
  if (!(entry.reps > 0 && entry.reps <= 1000)) errors.push('Wiederholungen: Zahl größer 0');
  if (ex.load === 'none') {
    if (entry.weight !== null) errors.push('Diese Übung hat kein Gewicht');
  } else if (ex.load === 'bw') {
    if (!(entry.weight >= 0 && entry.weight <= 300)) errors.push('Zusatzgewicht: 0 oder mehr kg');
  } else if (!(entry.weight > 0 && entry.weight <= 500)) {
    errors.push('Gewicht: Zahl größer 0');
  }
  return errors;
}

// Gewicht für die Anzeige, abhängig von der Übungsart.
export function formatWeight(exerciseId, weight) {
  switch (EXERCISES[exerciseId].load) {
    case 'none': return '—';
    case 'bw': return weight > 0 ? `KG + ${formatNumber(weight)} kg` : 'KG';
    case 'kg2': return `2 × ${formatNumber(weight)} kg`;
    default: return `${formatNumber(weight)} kg`;
  }
}

const UNIT_LABEL = { Wdh: 'Wdh.', m: 'm', s: 's' };

// Eintrag als kurzer Text. Beispiel: "4 × 10 Wdh. · 40 kg" oder "3 × 30 s / Seite · KG"
export function formatEntry(entry) {
  const ex = EXERCISES[entry.exercise];
  const side = ex.perSide ? ' / Seite' : '';
  return `${entry.sets} × ${formatNumber(entry.reps)} ${UNIT_LABEL[ex.unit]}${side} · ${formatWeight(entry.exercise, entry.weight)}`;
}

// Gym-Eintrag speichern: pro Tag und Übung gibt es genau einen Eintrag.
// Existiert schon einer (z. B. "Erledigt" getippt, dann "Ändern"), wird er ersetzt statt verdoppelt.
// `now` und `newId` werden übergeben, damit die Funktion testbar bleibt.
export function upsertGymEntry(entries, entry, now, newId) {
  const index = entries.findIndex((e) => e.type === 'gym' && e.date === entry.date && e.exercise === entry.exercise);
  if (index === -1) return [...entries, { ...entry, id: newId, createdAt: now }];
  const old = entries[index];
  const updated = { ...old, ...entry, id: old.id, createdAt: old.createdAt, updatedAt: now };
  return entries.map((e, i) => (i === index ? updated : e));
}
