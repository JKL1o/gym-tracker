// Datenspeicher. Vorläufig im Browser (localStorage) – in Schritt 7 wird hier auf Firebase
// umgestellt. Der Rest der App greift nur über diese Funktionen auf Daten zu.
import { upsertGymEntry } from './entries.js';

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
