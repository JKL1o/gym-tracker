// Datenspeicher. Vorläufig im Browser (localStorage) – in Schritt 7 wird hier auf Firebase
// umgestellt. Der Rest der App greift nur über diese Funktionen auf Daten zu.
import { upsertGymEntry, removeGymEntry, upsertDayEntry, removeDayEntry } from './entries.js';

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


// Fußball oder Körpergewicht speichern (ein Eintrag pro Art und Tag)
export function saveDayEntry(entry) {
  const all = upsertDayEntry(loadEntries(), entry, new Date().toISOString(), crypto.randomUUID());
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteDayEntry(type, date) {
  localStorage.setItem(KEY, JSON.stringify(removeDayEntry(loadEntries(), type, date)));
}
