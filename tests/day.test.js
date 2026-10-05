// Prüft Fußball- und Körpergewicht-Einträge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertDayEntry, removeDayEntry, validateFootball, validateBodyweight, bodyweightHistory, bodyweightChange,
} from '../js/entries.js';

test('Ein Eintrag pro Art und Tag: gleicher Tag ersetzt, andere Art bleibt', () => {
  let all = upsertDayEntry([], { type: 'football', date: '2026-10-09', kind: 'training', minutes: null }, 't1', 'a');
  all = upsertDayEntry(all, { type: 'football', date: '2026-10-09', kind: 'match', minutes: 60 }, 't2', 'b');
  all = upsertDayEntry(all, { type: 'bodyweight', date: '2026-10-09', kg: 68 }, 't3', 'c');
  assert.equal(all.length, 2);
  assert.deepEqual(all[0], { type: 'football', date: '2026-10-09', kind: 'match', minutes: 60, id: 'a', createdAt: 't1', updatedAt: 't2' });
  all = removeDayEntry(all, 'football', '2026-10-09');
  assert.deepEqual(all.map((e) => e.type), ['bodyweight']);
});

test('Fußball: Match braucht Spielminuten, Training nicht', () => {
  assert.deepEqual(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 90 }), []);
  assert.deepEqual(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 0 }), []);
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: null }).length, 1);
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 200 }).length, 1);
  assert.equal(validateFootball({ date: '2026-10-09', kind: 'match', minutes: 45.5 }).length, 1);
  assert.deepEqual(validateFootball({ date: '2026-10-07', kind: 'training', minutes: null }), []);
  assert.equal(validateFootball({ date: '2026-10-07', kind: 'x', minutes: null }).length, 1);
});

test('Körpergewicht: nur plausible Werte', () => {
  assert.deepEqual(validateBodyweight({ date: '2026-10-05', kg: 68.4 }), []);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: null }).length, 1);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: NaN }).length, 1);
  assert.equal(validateBodyweight({ date: '2026-10-05', kg: 684 }).length, 1);
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
