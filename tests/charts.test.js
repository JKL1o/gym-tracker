// Prüft die Daten für die Diagramme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exercisesWithData, exerciseSeries, bodyweightSeries, weeklyCounts, niceTicks } from '../js/charts-data.js';

const gym = (date, exercise, weight, extra = {}) => ({ type: 'gym', date, exercise, weight, sets: 4, reps: 8, session: 'oka', ...extra });

test('Übungsauswahl: nur mit Gewicht, zuletzt trainierte zuerst', () => {
  const list = exercisesWithData([
    gym('2026-09-28', 'kniebeuge', 40),
    gym('2026-10-05', 'klimmzuege', 2.5),
    gym('2026-10-05', 'box_jump', null), // ohne Gewicht → nicht im Diagramm
    gym('2026-10-03', 'kniebeuge', 42.5),
  ]);
  assert.deepEqual(list.map((x) => x.id), ['klimmzuege', 'kniebeuge']);
});

test('Gewichtsverlauf einer Übung, nach Datum sortiert', () => {
  const s = exerciseSeries([
    gym('2026-10-03', 'kniebeuge', 42.5),
    gym('2026-09-28', 'kniebeuge', 40),
    gym('2026-10-05', 'klimmzuege', 2.5),
  ], 'kniebeuge');
  assert.deepEqual(s.map((p) => [p.date, p.value]), [['2026-09-28', 40], ['2026-10-03', 42.5]]);
});

test('Körpergewicht aufsteigend nach Datum', () => {
  const s = bodyweightSeries([
    { type: 'bodyweight', date: '2026-10-05', kg: 68.4 },
    { type: 'bodyweight', date: '2026-09-28', kg: 67.9 },
    gym('2026-10-01', 'kniebeuge', 40),
  ]);
  assert.deepEqual(s.map((p) => p.value), [67.9, 68.4]);
});

test('Einheiten pro Woche: Gym zählt Tage, nicht Übungen; aktuelle Woche zuletzt', () => {
  const entries = [
    gym('2026-10-05', 'klimmzuege', 2.5), gym('2026-10-05', 'dips', 0), // 1 Tag
    gym('2026-10-07', 'dips', 0, { session: 'arme' }),                  // 2. Tag
    { type: 'football', date: '2026-10-05', kind: 'training', minutes: null },
    { type: 'football', date: '2026-10-09', kind: 'match', minutes: 72 },
    gym('2026-09-28', 'klimmzuege', 2.5),                                // Vorwoche
  ];
  const w = weeklyCounts(entries, '2026-10-09', 3);
  assert.deepEqual(w.map((x) => [x.kw, x.gym, x.football]), [[39, 0, 0], [40, 1, 0], [41, 2, 2]]);
  assert.equal(w[2].from, '2026-10-05');
});

test('Runde Achsenwerte', () => {
  assert.deepEqual(niceTicks(40, 50), [40, 42.5, 45, 47.5, 50]);
  assert.deepEqual(niceTicks(67.9, 68.6), [67.8, 68, 68.2, 68.4, 68.6]);
  assert.deepEqual(niceTicks(0, 4), [0, 1, 2, 3, 4]);
  const one = niceTicks(40, 40);
  assert.ok(one[0] < 40 && one.at(-1) > 40, 'ein einzelner Wert liegt zwischen den Ticks');
});

test('Achse geht bei Gewichten nie unter 0 (Fehler: Dips mit 0 kg zeigten -1 bis 1)', () => {
  assert.ok(niceTicks(0, 0).every((t) => t >= 0));
  assert.ok(niceTicks(0, 0).length >= 2);
});

test('Körpergewicht-Übung ohne Zusatzgewicht zeigt Wiederholungen, sonst Gewicht', async () => {
  const { exerciseMetric } = await import('../js/charts-data.js');
  const dips = [{ date: '2026-10-05', value: 0, sets: 3, reps: 8 }, { date: '2026-10-07', value: 0, sets: 3, reps: 10 }];
  const m = exerciseMetric(dips, 'bw');
  assert.deepEqual([m.unit, m.points.map((p) => p.value)], ['Wdh.', [8, 10]]);
  const klimm = [{ date: '2026-10-05', value: 2.5, sets: 4, reps: 6 }];
  assert.equal(exerciseMetric(klimm, 'bw').unit, 'kg');
  assert.equal(exerciseMetric(klimm, 'kg2').label, 'Gewicht pro Hand in kg');
});
