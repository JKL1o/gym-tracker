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

// Feste ID pro Eintrag: pro Tag und Übung (Gym) bzw. pro Tag und Art (Fußball, Körpergewicht)
// gibt es genau einen Datensatz. Speichern mit derselben ID überschreibt – so entstehen keine
// Duplikate, auch nicht, wenn Handy und PC offline beide etwas eintragen.
export function entryDocId(entry) {
  if (entry.type === 'gym') return `gym_${entry.date}_${entry.exercise}`;
  return `${entry.type}_${entry.date}`;
}

// Welche Einheit gilt an einem Tag?
// 1. selbst gewählt (override)  2. Einheit, die an dem Tag schon eingetragen ist  3. laut Plan
// An einem freien Tag ohne Einträge: null – dann wird keine Einheit angezeigt.
export function sessionForDay({ date, planned, override, entries }) {
  return override ?? entries.find((e) => e.type === 'gym' && e.date === date)?.session ?? planned ?? null;
}

// ---------- Fußball und Körpergewicht ----------

// Fußball: kind 'training' oder 'match'; bei Match Spielminuten (0–150, inkl. Verlängerung)
export function validateFootball(entry) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? '')) errors.push('Datum fehlt');
  if (entry.kind === 'match') {
    if (!Number.isInteger(entry.minutes) || entry.minutes < 0 || entry.minutes > 150) errors.push('Spielminuten: ganze Zahl von 0 bis 150');
  } else if (entry.kind === 'training') {
    if (entry.minutes !== null) errors.push('Training hat keine Spielminuten');
  } else {
    errors.push('Training oder Match wählen');
  }
  return errors;
}

// Körpergewicht in kg (30–200, mit Kommastellen); Datum nicht in der Zukunft
export function validateBodyweight(entry, today) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? '')) errors.push('Datum fehlt');
  else if (entry.date > today) errors.push('Datum liegt in der Zukunft');
  if (!(entry.kg >= 30 && entry.kg <= 200)) errors.push('Gewicht: Zahl zwischen 30 und 200 kg');
  return errors;
}

// Messungen nach Datum, neueste zuerst
export function bodyweightHistory(entries) {
  return entries.filter((e) => e.type === 'bodyweight').sort((a, b) => b.date.localeCompare(a.date));
}

// Veränderung der neuesten Messung zur vorherigen (auf 0,1 kg gerundet), null wenn < 2 Messungen
export function bodyweightChange(entries) {
  const [latest, previous] = bodyweightHistory(entries);
  if (!latest || !previous) return null;
  return Math.round((latest.kg - previous.kg) * 10) / 10;
}
