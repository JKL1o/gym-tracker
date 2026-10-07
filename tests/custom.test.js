// Prüft selbst angelegte Übungen: Einhängen in den Plan, Prüfung, Vorbelegung, Export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, SESSIONS, applyCustomExercises, planWeightText } from '../js/plan.js';
import { validateCustomExercise, newExerciseKey } from '../js/custom.js';
import { defaultsFor, entryDocId, formatEntry } from '../js/entries.js';
import { toCSV } from '../js/export.js';

const custom = {
  type: 'exercise', key: 'c_test1', name: 'Cable Crunch', session: 'arme', load: 'kg', sets: 3, reps: 12, weight: 25,
  createdAt: '2026-10-05T10:00:00Z',
};

test('Planwert-Text im Gym.md-Format', () => {
  assert.equal(planWeightText('kg', 25), '25 kg');
  assert.equal(planWeightText('kg2', 12.5), '2 × 12,5 kg');
  assert.equal(planWeightText('bw', 0), 'KG');
  assert.equal(planWeightText('bw', 5), '+5 kg');
  assert.equal(planWeightText('none', null), '—');
});

test('Eigene Übung erscheint am Ende der Einheit, Vorbelegung aus Planwerten', () => {
  const before = SESSIONS.arme.items.length;
  applyCustomExercises([custom]);
  assert.equal(SESSIONS.arme.items.length, before + 1);
  assert.equal(SESSIONS.arme.items.at(-1).ex, 'c_test1');
  assert.equal(EXERCISES.c_test1.name, 'Cable Crunch');
  assert.deepEqual(defaultsFor('arme', 'c_test1', []), { sets: 3, reps: 12, weight: 25 });
  assert.equal(formatEntry({ exercise: 'c_test1', sets: 3, reps: 12, weight: 25 }), '3 × 12 Wdh. · 25 kg');
  applyCustomExercises([]);
  assert.equal(SESSIONS.arme.items.length, before, 'zurück auf Gym.md-Stand');
  assert.equal(EXERCISES.c_test1, undefined);
});

test('Entfernte Übung: nicht mehr in der Einheit, Name bleibt für alte Einträge (CSV)', () => {
  const before = SESSIONS.arme.items.length;
  applyCustomExercises([{ ...custom, archived: true }]);
  assert.equal(SESSIONS.arme.items.length, before);
  const csv = toCSV([{ type: 'gym', date: '2026-10-07', session: 'arme', exercise: 'c_test1', sets: 3, reps: 12, weight: 25 }]);
  assert.match(csv, /Cable Crunch/);
  applyCustomExercises([]);
});

test('CSV ignoriert die Übungs-Definitionen selbst', () => {
  const lines = toCSV([custom]).trimEnd().split('\r\n');
  assert.equal(lines.length, 1, 'nur Kopfzeile');
});

test('Prüfung neuer Übungen', () => {
  const ok = { name: 'Cable Crunch', session: 'arme', load: 'kg', sets: 3, reps: 12, weight: 25 };
  assert.deepEqual(validateCustomExercise(ok), []);
  assert.equal(validateCustomExercise({ ...ok, name: '  ' }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, name: 'x'.repeat(41) }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, name: 'hammer curls' }).length, 1, 'gibt es schon (Groß/klein egal)');
  assert.equal(validateCustomExercise({ ...ok, session: 'xyz' }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, load: '' }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, sets: 0 }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, reps: NaN }).length, 1);
  assert.equal(validateCustomExercise({ ...ok, weight: null }).length, 1);
  assert.deepEqual(validateCustomExercise({ ...ok, load: 'bw', weight: 0 }), []);
  assert.deepEqual(validateCustomExercise({ ...ok, load: 'none', weight: null }), []);
});

test('Schlüssel und Speicher-ID eigener Übungen', () => {
  const key = newExerciseKey(1791196000000, 0.5);
  assert.match(key, /^c_[a-z0-9]+$/);
  assert.notEqual(newExerciseKey(1, 0.1), newExerciseKey(1, 0.9));
  assert.equal(entryDocId({ type: 'exercise', key: 'c_abc' }), 'exercise_c_abc');
});

test('Auch Gym.md-Übungen lassen sich aus einer Einheit entfernen und wiederherstellen', () => {
  const before = SESSIONS.oka.items.map((i) => i.ex);
  applyCustomExercises([], [{ session: 'oka', exercise: 'face_pull' }]);
  assert.ok(!SESSIONS.oka.items.some((i) => i.ex === 'face_pull'), 'Face Pull weg');
  assert.equal(SESSIONS.oka.items.length, before.length - 1);
  assert.ok(SESSIONS.arme.items.some((i) => i.ex === 'dips'), 'andere Einheiten unberührt');
  assert.equal(EXERCISES.face_pull.name, 'Face Pull', 'Name bleibt für alte Einträge');
  applyCustomExercises([], [{ session: 'oka', exercise: 'dips' }]);
  assert.ok(SESSIONS.arme.items.some((i) => i.ex === 'dips'), 'Dips nur in Oberkörper A entfernt, in Arme + Core noch da');
  applyCustomExercises([], []);
  assert.deepEqual(SESSIONS.oka.items.map((i) => i.ex), before, 'wiederhergestellt');
  assert.equal(entryDocId({ type: 'hidden', session: 'oka', exercise: 'face_pull' }), 'hidden_oka_face_pull');
});
