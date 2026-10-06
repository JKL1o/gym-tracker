// Prüft Kalenderwoche und Wochenübersicht (geplant / gemacht / ausgefallen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, dayStatus, weekSummary } from '../js/week.js';
import { plannedWeek } from '../js/plan.js';

test('Kalenderwoche nach ISO 8601', () => {
  assert.equal(isoWeek(new Date(2026, 9, 5)), 41);   // Mo 05.10.2026
  assert.equal(isoWeek(new Date(2026, 9, 11)), 41);  // So 11.10.2026
  assert.equal(isoWeek(new Date(2026, 0, 1)), 1);    // Do 01.01.2026
  assert.equal(isoWeek(new Date(2026, 11, 28)), 53); // 2026 hat 53 Wochen
  assert.equal(isoWeek(new Date(2027, 0, 1)), 53);   // Fr 01.01.2027 gehört noch zu KW 53
  assert.equal(isoWeek(new Date(2027, 0, 4)), 1);    // Mo 04.01.2027
});

const week = plannedWeek('normal', new Date(2026, 9, 5)); // Mo 05.10. – So 11.10.
const gym = (date, exercise, session) => ({ type: 'gym', date, exercise, session });

test('Gym: alles, teilweise, ausgefallen, offen', () => {
  const entries = [
    ...['klimmzuege', 'schraegbank_kh', 'lh_rudern', 'dips', 'schulterdruecken_kh', 'face_pull']
      .map((ex) => gym('2026-10-05', ex, 'oka')),
    gym('2026-10-07', 'dips', 'arme'),
  ];
  const today = '2026-10-09'; // Freitag
  assert.equal(dayStatus(week[0], entries, today).gym.status, 'done');     // Mo 6/6
  const mi = dayStatus(week[2], entries, today).gym;
  assert.deepEqual([mi.status, mi.done, mi.total], ['partial', 1, 10]);     // Mi 1/10 (ohne Sprint)
  assert.equal(dayStatus(week[3], entries, today).gym.status, 'missed');   // Do nichts, vorbei
  assert.equal(dayStatus(week[5], entries, today).gym.status, 'open');     // Sa kommt noch
  assert.equal(dayStatus(week[1], entries, today).gym, null);              // Di frei
});

test('Gym an einem freien Tag zählt als gemacht, aber "nicht laut Plan"', () => {
  const s = dayStatus(week[1], [gym('2026-10-06', 'kniebeuge', 'uk')], '2026-10-09').gym;
  assert.equal(s.session, 'uk');
  assert.equal(s.planned, false);
  assert.equal(s.status, 'partial');
});

test('Fußball: Match mit Minuten, ausgefallenes Training, Match statt Training', () => {
  const entries = [
    { type: 'football', date: '2026-10-09', kind: 'match', minutes: 72 },
    { type: 'football', date: '2026-10-07', kind: 'match', minutes: null },
  ];
  const today = '2026-10-10';
  assert.deepEqual(dayStatus(week[4], entries, today).football,
    { kind: 'match', minutes: 72, planned: true, status: 'done' });
  assert.equal(dayStatus(week[0], entries, today).football.status, 'missed'); // Mo Training nicht eingetragen
  assert.equal(dayStatus(week[2], entries, today).football.planned, false);   // Mi Match statt Training
  assert.equal(dayStatus(week[6], entries, today).football, null);            // So nichts
});

test('Wochenzusammenfassung zählt geplant/gemacht und listet Ausgefallenes', () => {
  const entries = [
    gym('2026-10-05', 'klimmzuege', 'oka'),
    { type: 'football', date: '2026-10-05', kind: 'training', minutes: null },
    { type: 'football', date: '2026-10-09', kind: 'match', minutes: 80 },
  ];
  const s = weekSummary(week, entries, '2026-10-12'); // Woche vorbei
  assert.equal(s.gymPlanned, 4);
  assert.equal(s.gymDone, 1);
  assert.equal(s.footballPlanned, 4);
  assert.equal(s.footballDone, 2);
  assert.deepEqual(s.missed.map((m) => `${m.dayName} ${m.what}`),
    ['Mi gym', 'Mi training', 'Do gym', 'Do training', 'Sa gym']);
});

test('Einträge vom Typ "exercise" (eigene Übungen) zählen nicht als Training', () => {
  const s = dayStatus(week[1], [{ type: 'exercise', key: 'c_x', session: 'uk' }], '2026-10-09');
  assert.deepEqual(s, { gym: null, football: null });
});
