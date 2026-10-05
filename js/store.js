// Datenspeicher. Vorläufig im Browser (localStorage) – in Schritt 7 wird hier auf Firebase
// umgestellt. Der Rest der App greift nur über diese Funktionen auf Daten zu.
const KEY = 'gymtracker.entries.v1';

export function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function addEntry(entry) {
  const all = loadEntries();
  const saved = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  all.push(saved);
  localStorage.setItem(KEY, JSON.stringify(all));
  return saved;
}
