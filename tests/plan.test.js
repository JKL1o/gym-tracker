// Prüft, dass Gym.md korrekt übernommen wurde und die Datumslogik stimmt.
// Ausführen im Ordner Gym-Tracker: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, SESSIONS, WEEK_TYPES, mondayOf, toISODate, plannedWeek } from '../js/plan.js';

test('jede Übung in den Einheiten existiert im Katalog', () => {
  for (const [id, session] of Object.entries(SESSIONS)) {
    for (const item of session.items) {
      assert.ok(EXERCISES[item.ex], `${id}: unbekannte Übung ${item.ex}`);
    }
  }
});

test('Anzahl Übungen: Gym.md ohne die 2 Sprints = 30 Einträge, 29 verschiedene (Dips doppelt)', () => {
  const all = Object.values(SESSIONS).flatMap((s) => s.items.map((i) => i.ex));
  assert.equal(all.length, 30);
  assert.equal(new Set(all).size, 29);
  assert.ok(!all.includes('sprint_20') && !all.includes('sprint_30'), 'Sprints gestrichen');
  assert.equal(Object.keys(EXERCISES).length, 31, 'Katalog behält die Sprints für alte Einträge');
});

function daysWith(type, predicate) {
  return WEEK_TYPES[type].days
    .map((d, i) => (predicate(d) ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i] : null))
    .filter(Boolean);
}

test('Normale Woche: Gym Mo/Mi/Do/Sa, Training Mo/Mi/Do, Match Fr', () => {
  assert.deepEqual(daysWith('normal', (d) => d.gym), ['Mo', 'Mi', 'Do', 'Sa']);
  assert.deepEqual(daysWith('normal', (d) => d.football === 'training'), ['Mo', 'Mi', 'Do']);
  assert.deepEqual(daysWith('normal', (d) => d.football === 'match'), ['Fr']);
  assert.equal(WEEK_TYPES.normal.days[5].gym, 'uk');
});

test('Samstagsmatch: Unterkörper Di, Training Mo/Mi/Fr, Match Sa', () => {
  assert.equal(WEEK_TYPES.samstagsmatch.days[1].gym, 'uk');
  assert.deepEqual(daysWith('samstagsmatch', (d) => d.gym), ['Mo', 'Di', 'Mi', 'Do']);
  assert.deepEqual(daysWith('samstagsmatch', (d) => d.football === 'training'), ['Mo', 'Mi', 'Fr']);
  assert.deepEqual(daysWith('samstagsmatch', (d) => d.football === 'match'), ['Sa']);
});

test('mondayOf: Montag bleibt, Sonntag gehört zur Woche davor, Jahreswechsel', () => {
  assert.equal(toISODate(mondayOf(new Date(2026, 9, 5))), '2026-10-05');  // Mo
  assert.equal(toISODate(mondayOf(new Date(2026, 9, 11))), '2026-10-05'); // So
  assert.equal(toISODate(mondayOf(new Date(2027, 0, 1))), '2026-12-28');  // Fr 01.01.2027
});

test('plannedWeek: 7 aufeinanderfolgende Tage, auch über die Zeitumstellung (25.10.2026)', () => {
  const week = plannedWeek('normal', new Date(2026, 9, 19));
  assert.deepEqual(week.map((d) => d.date), [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
  ]);
  assert.equal(week[4].football, 'match');
});

test('plannedWeek: unbekannter Wochentyp wirft Fehler', () => {
  assert.throws(() => plannedWeek('urlaub', new Date(2026, 9, 5)));
});
