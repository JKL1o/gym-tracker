// Prüft Vorbelegung, Eingabeprüfung und Anzeige von Gym-Einträgen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, SESSIONS } from '../js/plan.js';
import {
  parsePlanWeight, parsePlanSets, parsePlanReps, parseNumber,
  lastEntryFor, defaultsFor, validateGym, formatEntry,
} from '../js/entries.js';

test('Planwerte Gewicht werden richtig gelesen', () => {
  assert.equal(parsePlanWeight('+2,5 kg'), 2.5);
  assert.equal(parsePlanWeight('2 × 14 kg'), 14);
  assert.equal(parsePlanWeight('21,25 kg'), 21.25);
  assert.equal(parsePlanWeight('KG'), 0);
  assert.equal(parsePlanWeight('—'), null);
  assert.equal(parsePlanWeight('Band'), null);
});

test('Planwerte Sätze und Wiederholungen', () => {
  assert.equal(parsePlanSets('4'), 4);
  assert.equal(parsePlanSets('1 + 3'), 4);
  assert.equal(parsePlanReps('8–12'), 8);
  assert.equal(parsePlanReps('40 m'), 40);
  assert.equal(parsePlanReps('30 s / Seite'), 30);
});

test('Jede Übung im Plan ergibt eine gültige Vorbelegung (Plan fehlerfrei lesbar)', () => {
  for (const [sessionId, session] of Object.entries(SESSIONS)) {
    for (const item of session.items) {
      const d = defaultsFor(sessionId, item.ex, []);
      const errors = validateGym({ date: '2026-10-05', exercise: item.ex, ...d });
      assert.deepEqual(errors, [], `${sessionId}/${item.ex}: ${errors.join(', ')}`);
    }
  }
});

test('Eingaben mit Komma, Punkt, leer und Unsinn', () => {
  assert.equal(parseNumber('2,5'), 2.5);
  assert.equal(parseNumber(' 40 '), 40);
  assert.equal(parseNumber('37.5'), 37.5);
  assert.equal(parseNumber(''), null);
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('-5')));
});

test('Vorbelegung nimmt den neuesten Eintrag, sonst den Plan', () => {
  const entries = [
    { type: 'gym', exercise: 'kniebeuge', date: '2026-10-03', createdAt: '2026-10-03T10:00:00Z', sets: 4, reps: 8, weight: 42.5 },
    { type: 'gym', exercise: 'kniebeuge', date: '2026-09-26', createdAt: '2026-09-26T10:00:00Z', sets: 4, reps: 6, weight: 40 },
  ];
  assert.equal(lastEntryFor(entries, 'kniebeuge').weight, 42.5);
  assert.deepEqual(defaultsFor('uk', 'kniebeuge', entries), { sets: 4, reps: 8, weight: 42.5 });
  assert.deepEqual(defaultsFor('okb', 'tbar_rudern', entries), { sets: 4, reps: 6, weight: 100 });
});

test('Eingabeprüfung lehnt falsche Werte ab', () => {
  const ok = { date: '2026-10-05', exercise: 'lh_rudern', sets: 4, reps: 10, weight: 40 };
  assert.deepEqual(validateGym(ok), []);
  assert.equal(validateGym({ ...ok, sets: 0 }).length, 1);
  assert.equal(validateGym({ ...ok, sets: 2.5 }).length, 1);
  assert.equal(validateGym({ ...ok, reps: NaN }).length, 1);
  assert.equal(validateGym({ ...ok, weight: null }).length, 1);
  assert.equal(validateGym({ ...ok, weight: 0 }).length, 1);
  assert.deepEqual(validateGym({ ...ok, exercise: 'dips', weight: 0 }), []); // nur Körpergewicht
  assert.equal(validateGym({ ...ok, exercise: 'box_jump', weight: 10 }).length, 1);
  assert.equal(validateGym({ ...ok, date: '' }).length, 1);
});

test('Anzeige berücksichtigt Übungsart, Einheit und Seite', () => {
  assert.equal(formatEntry({ exercise: 'lh_rudern', sets: 4, reps: 10, weight: 40 }), '4 × 10 Wdh. · 40 kg');
  assert.equal(formatEntry({ exercise: 'schraegbank_kh', sets: 4, reps: 8, weight: 14 }), '4 × 8 Wdh. · 2 × 14 kg');
  assert.equal(formatEntry({ exercise: 'klimmzuege', sets: 4, reps: 6, weight: 2.5 }), '4 × 6 Wdh. · KG + 2,5 kg');
  assert.equal(formatEntry({ exercise: 'copenhagen_plank', sets: 3, reps: 30, weight: 0 }), '3 × 30 s / Seite · KG');
  assert.equal(formatEntry({ exercise: 'farmers_walk', sets: 3, reps: 40, weight: 15 }), '3 × 40 m · 2 × 15 kg');
  assert.equal(formatEntry({ exercise: 'box_jump', sets: 3, reps: 3, weight: null }), '3 × 3 Wdh. · —');
});

test('Per-Hand-Übungen laut Rückmeldung (Hammer Curls, Curls im Sitzen, Seitheben, Bulgarian)', () => {
  for (const id of ['hammer_curls', 'curls_sitzen', 'seitheben', 'bulgarian_split']) {
    assert.equal(EXERCISES[id].load, 'kg2', id);
  }
});

test('Speichern: neuer Eintrag wird angehängt, gleicher Tag + Übung wird ersetzt', async () => {
  const { upsertGymEntry } = await import('../js/entries.js');
  const base = { type: 'gym', date: '2026-10-05', exercise: 'klimmzuege', session: 'oka', sets: 4, reps: 5, weight: 2.5 };
  let all = upsertGymEntry([], base, 't1', 'id1');
  assert.equal(all.length, 1);
  all = upsertGymEntry(all, { ...base, reps: 7 }, 't2', 'id2');
  assert.equal(all.length, 1, 'kein Duplikat');
  assert.equal(all[0].reps, 7);
  assert.equal(all[0].id, 'id1');
  assert.equal(all[0].createdAt, 't1');
  assert.equal(all[0].updatedAt, 't2');
  all = upsertGymEntry(all, { ...base, date: '2026-10-12' }, 't3', 'id3');
  assert.equal(all.length, 2, 'anderer Tag = neuer Eintrag');
  all = upsertGymEntry(all, { ...base, exercise: 'dips', weight: 0 }, 't4', 'id4');
  assert.equal(all.length, 3, 'andere Übung = neuer Eintrag');
});
