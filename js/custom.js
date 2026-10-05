// Prüfung neuer, selbst angelegter Übungen – ohne Browser, automatisch testbar.
import { EXERCISES, SESSIONS } from './plan.js';

export const LOAD_TYPES = {
  kg: 'Gewicht (kg)',
  kg2: 'Kurzhanteln (kg pro Hand)',
  bw: 'Körpergewicht (+ Zusatz-kg)',
  none: 'Ohne Gewicht',
};

// Gibt eine Liste von Fehlermeldungen zurück (leer = in Ordnung)
export function validateCustomExercise(c) {
  const errors = [];
  const name = (c.name ?? '').trim();
  if (!name) errors.push('Name fehlt');
  else if (name.length > 40) errors.push('Name: höchstens 40 Zeichen');
  else if (SESSIONS[c.session]?.items.some((i) => EXERCISES[i.ex]?.name.toLowerCase() === name.toLowerCase())) {
    errors.push('Diese Übung gibt es in der Einheit schon');
  }
  if (!SESSIONS[c.session]) errors.push('Einheit fehlt');
  if (!LOAD_TYPES[c.load]) errors.push('Art wählen');
  if (!Number.isInteger(c.sets) || c.sets < 1 || c.sets > 20) errors.push('Sätze: ganze Zahl von 1 bis 20');
  if (!Number.isInteger(c.reps) || c.reps < 1 || c.reps > 100) errors.push('Wiederholungen: ganze Zahl von 1 bis 100');
  if (c.load === 'none') {
    if (c.weight !== null) errors.push('Diese Art hat kein Gewicht');
  } else if (c.load === 'bw') {
    if (!(c.weight >= 0 && c.weight <= 300)) errors.push('Zusatzgewicht: 0 oder mehr kg');
  } else if (!(c.weight > 0 && c.weight <= 500)) {
    errors.push('Gewicht: Zahl größer 0');
  }
  return errors;
}

// Eindeutiger Schlüssel für eine neue Übung, z. B. "c_lq3k9x2a"
export function newExerciseKey(now = Date.now(), random = Math.random()) {
  return `c_${now.toString(36)}${Math.floor(random * 1296).toString(36).padStart(2, '0')}`;
}
