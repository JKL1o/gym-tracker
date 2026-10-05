// Datenspeicher. Vorläufig im Browser (localStorage) – in Schritt 7 wird hier auf Firebase
// umgestellt. Der Rest der App greift nur über diese Funktionen auf Daten zu.
import { upsertGymEntry, removeGymEntry } from './entries.js';

const KEY = 'gymtracker.entries.v1';

export function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

// Gym-Eintrag speichern oder den vom selben Tag ersetzen
export function saveGymEntry(entry) {
  const all = upsertGymEntry(loadEntries(), entry, new Date().toISOString(), crypto.randomUUID());
  localStorage.setItem(KEY, JSON.stringify(all));
}

// Gym-Eintrag eines Tages entfernen ("Erledigt" zurücknehmen)
export function deleteGymEntry(date, exerciseId) {
  localStorage.setItem(KEY, JSON.stringify(removeGymEntry(loadEntries(), date, exerciseId)));
}

// Wochentyp ('normal' = Match Freitag, 'samstagsmatch') pro Woche, Schlüssel = Datum des Montags
const WEEK_KEY = 'gymtracker.weektypes.v1';

function loadWeekTypes() {
  try {
    return JSON.parse(localStorage.getItem(WEEK_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function getWeekType(mondayISO) {
  return loadWeekTypes()[mondayISO] ?? 'normal';
}

export function setWeekType(mondayISO, type) {
  const all = loadWeekTypes();
  all[mondayISO] = type;
  localStorage.setItem(WEEK_KEY, JSON.stringify(all));
}
