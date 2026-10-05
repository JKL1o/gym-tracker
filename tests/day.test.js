// Prüft Fußball- und Körpergewicht-Einträge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFootball, validateBodyweight, bodyweightHistory, bodyweightChange } from '../js/entries.js';

test('Fußball: Match mit Spielminuten oder noch ohne, Training ohne', () => {
  assert.deepEqual(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 90 }), []);
  assert.deepEqual(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 0 }), []);
  assert.deepEqual(validateFootball({ date: '2026-10-09', kind: 'match', minutes: null }), [], 'abgehakt, Minuten folgen');
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 200 }).length, 1);
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 45.5 }).length, 1);
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: NaN }).length, 1);
  assert.deepEqual(validateFootball({ date: '2026-10-07', kind: 'training', minutes: null }), []);
  assert.equal(validateFootball({ date: '2026-10-07', kind: 'x', minutes: null }).length, 1);
});

test('Körpergewicht: nur plausible Werte, kein Datum in der Zukunft', () => {
  const today = '2026-10-05';
  assert.deepEqual(validateBodyweight({ date: '2026-10-05', kg: 68.4 }, today), []);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: null }, today).length, 1);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: NaN }, today).length, 1);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: 684 }, today).length, 1);
  assert.equal(validateBodyweight({ date: '2026-10-06', kg: 68 }, today).length, 1);
});

test('Verlauf neueste zuerst, Veränderung zur vorherigen Messung', () => {
  const entries = [
    { type: 'bodyweight', date: '2026-10-01', kg: 67.9 },
    { type: 'bodyweight', date: '2026-10-08', kg: 68.6 },
    { type: 'bodyweight', date: '2026-10-05', kg: 68.2 },
    { type: 'gym', date: '2026-10-09' },
  ];
  assert.deepEqual(bodyweightHistory(entries).map((e) => e.kg), [68.6, 68.2, 67.9]);
  assert.equal(bodyweightChange(entries), 0.4);
  assert.equal(bodyweightChange(entries.slice(0, 1)), null);
});
