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
      if (item.kg === 'eintragen') {
        // Gewicht im Plan noch offen → beim ersten Abhaken muss es eingetragen werden
        assert.deepEqual(errors, ['Gewicht: Zahl größer 0'], `${sessionId}/${item.ex}`);
      } else {
        assert.deepEqual(errors, [], `${sessionId}/${item.ex}: ${errors.join(', ')}`);
      }
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

test('Feste IDs: gleicher Tag + Übung = gleiche ID, sonst verschieden', async () => {
  const { entryDocId } = await import('../js/entries.js');
  const a = { type: 'gym', date: '2026-10-05', exercise: 'klimmzuege' };
  assert.equal(entryDocId(a), 'gym_2026-10-05_klimmzuege');
  assert.equal(entryDocId({ ...a, reps: 7 }), entryDocId(a), 'Ändern überschreibt denselben Eintrag');
  assert.notEqual(entryDocId({ ...a, date: '2026-10-12' }), entryDocId(a));
  assert.notEqual(entryDocId({ ...a, exercise: 'dips' }), entryDocId(a));
  assert.equal(entryDocId({ type: 'football', date: '2026-10-09', kind: 'match' }), 'football_2026-10-09');
  assert.equal(entryDocId({ type: 'bodyweight', date: '2026-10-09', kg: 68 }), 'bodyweight_2026-10-09');
  assert.notEqual(entryDocId({ type: 'football', date: '2026-10-09' }), entryDocId({ type: 'bodyweight', date: '2026-10-09' }));
});

test('Per "Ändern" gespeicherte Werte gelten dauerhaft – auch nach Zurücknehmen des Hakens', async () => {
  const { defaultsFor, entryDocId } = await import('../js/entries.js');
  const target = { type: 'target', exercise: 'klimmzuege', sets: 4, reps: 7, weight: 5 };
  // kein Training mehr eingetragen (Haken zurückgenommen) → trotzdem die geänderten Werte
  assert.deepEqual(defaultsFor('oka', 'klimmzuege', [target]), { sets: 4, reps: 7, weight: 5 });
  // gespeicherte Werte haben Vorrang vor dem letzten Training
  const older = { type: 'gym', exercise: 'klimmzuege', date: '2026-10-01', createdAt: 'a', sets: 4, reps: 5, weight: 2.5 };
  assert.deepEqual(defaultsFor('oka', 'klimmzuege', [older, target]), { sets: 4, reps: 7, weight: 5 });
  assert.equal(entryDocId(target), 'target_klimmzuege');
});

test('Neuer Plan 18.10.: Handgelenk-Curls ohne Gewicht, Bauchmuskeln nur abhaken', async () => {
  const { formatEntry, defaultsFor, validateGym } = await import('../js/entries.js');
  const { SESSIONS } = await import('../js/plan.js');
  assert.deepEqual(SESSIONS.oka.items.map((i) => i.ex).slice(-2), ['handgelenk_curls', 'reverse_handgelenk']);
  assert.equal(SESSIONS.okb.items.at(-1).ex, 'bauchmuskeln');
  // ohne Gewicht: Anzeige fordert zum Eintragen auf statt "null kg"
  assert.equal(formatEntry({ exercise: 'handgelenk_curls', ...defaultsFor('oka', 'handgelenk_curls', []) }), '3 × 12 Wdh. · Gewicht eintragen');
  // Bauchmuskeln: keine Werte, Abhaken ist gültig
  const b = defaultsFor('okb', 'bauchmuskeln', []);
  assert.deepEqual(b, { sets: null, reps: null, weight: null });
  assert.deepEqual(validateGym({ date: '2026-10-22', exercise: 'bauchmuskeln', ...b }), []);
  assert.equal(formatEntry({ exercise: 'bauchmuskeln', ...b }), '');
});
