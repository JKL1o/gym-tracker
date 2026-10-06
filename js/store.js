// Datenspeicher: Firebase (Google-Login + Firestore-Datenbank).
//
// So funktioniert es:
// - Alle Einträge liegen unter users/{deine Nutzer-ID}/entries – nur du kannst sie lesen/schreiben
//   (abgesichert durch die Firestore-Regeln, siehe firestore.rules).
// - Firestore hält eine Kopie auf dem Gerät. Ohne Netz wird lokal gespeichert und später
//   automatisch hochgeladen.
// - Die App liest aus einer Kopie im Arbeitsspeicher (`cache`), die Firestore laufend aktuell hält.
//   Bei jeder Änderung (auch von einem anderen Gerät) wird die Oberfläche neu gezeichnet.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { entryDocId } from './entries.js';

export const isConfigured = firebaseConfig !== null;

let auth = null;
let db = null;
let user = null;
let authChecked = false; // erst true, wenn Firebase weiß, ob jemand angemeldet ist
let dataLoaded = false;  // erst true, wenn die Einträge einmal geladen wurden
let cache = [];
let unsubscribe = null;
let changeListener = () => {};
let errorListener = () => {};

export function onChange(fn) { changeListener = fn; }
export function onError(fn) { errorListener = fn; }

export function status() {
  return { configured: isConfigured, authChecked, user, dataLoaded };
}

export function initStore() {
  if (!isConfigured) return;
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });

  onAuthStateChanged(auth, (u) => {
    user = u;
    authChecked = true;
    unsubscribe?.();
    unsubscribe = null;
    cache = [];
    dataLoaded = false;
    if (u) {
      unsubscribe = onSnapshot(
        collection(db, 'users', u.uid, 'entries'),
        (snapshot) => {
          cache = snapshot.docs.map((d) => d.data());
          dataLoaded = true;
          changeListener();
        },
        (err) => errorListener(`Laden fehlgeschlagen: ${err.message}`),
      );
    }
    changeListener();
  });
}

export async function signIn() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    // Fenster selbst geschlossen = kein Fehler
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      errorListener(`Anmeldung fehlgeschlagen: ${err.code ?? err.message}`);
    }
  }
}

export function signOut() {
  return fbSignOut(auth);
}

export function loadEntries() {
  return cache;
}

function entryRef(id) {
  return doc(db, 'users', user.uid, 'entries', id);
}

// Speichern = Eintrag mit fester ID schreiben (überschreibt den alten vom selben Tag).
// Kein `await`: Firestore aktualisiert die lokale Kopie sofort, das Hochladen läuft im Hintergrund.
function write(entry) {
  const id = entryDocId(entry);
  const existing = cache.find((e) => e.id === id);
  const now = new Date().toISOString();
  const data = { ...entry, id, createdAt: existing?.createdAt ?? now, updatedAt: existing ? now : undefined };
  setDoc(entryRef(id), data).catch((err) => errorListener(`Speichern fehlgeschlagen: ${err.message}`));
}

function remove(id) {
  deleteDoc(entryRef(id)).catch((err) => errorListener(`Löschen fehlgeschlagen: ${err.message}`));
}

export function saveGymEntry(entry) {
  write(entry);
}

export function deleteGymEntry(date, exercise) {
  remove(entryDocId({ type: 'gym', date, exercise }));
}

// Fußball oder Körpergewicht (ein Eintrag pro Art und Tag)
export function saveDayEntry(entry) {
  write(entry);
}

export function deleteDayEntry(type, date) {
  remove(entryDocId({ type, date }));
}

// Mehrere Einträge auf einmal ("Alles erledigt"): ein Schreibvorgang statt vieler einzelner
function prepared(entry) {
  const id = entryDocId(entry);
  const existing = cache.find((e) => e.id === id);
  const now = new Date().toISOString();
  return { id, data: { ...entry, id, createdAt: existing?.createdAt ?? now, updatedAt: existing ? now : undefined } };
}

export function saveGymEntries(entries) {
  const batch = writeBatch(db);
  for (const entry of entries) {
    const { id, data } = prepared(entry);
    batch.set(entryRef(id), data);
  }
  batch.commit().catch((err) => errorListener(`Speichern fehlgeschlagen: ${err.message}`));
}

export function deleteGymEntries(date, exercises) {
  const batch = writeBatch(db);
  for (const exercise of exercises) batch.delete(entryRef(entryDocId({ type: 'gym', date, exercise })));
  batch.commit().catch((err) => errorListener(`Löschen fehlgeschlagen: ${err.message}`));
}

// Eigene Übung anlegen oder ändern (z. B. archived: true = aus dem Plan entfernen)
export function saveCustomExercise(exercise) {
  write({ ...exercise, type: 'exercise' });
}

// Per "Ändern" gespeicherte Werte einer Übung – gelten dauerhaft als neue Vorbelegung
export function saveTarget(exercise, values) {
  write({ type: 'target', exercise, sets: values.sets, reps: values.reps, weight: values.weight });
}
