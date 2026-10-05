// Prüft den CSV-Export und die Tageslogik (welche Einheit gilt an welchem Tag).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCSV } from '../js/export.js';
import { sessionForDay } from '../js/entries.js';

test('CSV: Kopfzeile, Sortierung nach Datum, Dezimalkomma, Semikolon', () => {
  const csv = toCSV([
    { type: 'gym', date: '2026-10-07', createdAt: 'b', session: 'arme', exercise: 'trizeps_seilzug', sets: 4, reps: 12, weight: 21.25 },
    { type: 'gym', date: '2026-10-05', createdAt: 'a', session: 'oka', exercise: 'klimmzuege', sets: 4, reps: 5, weight: 2.5 },
    { type: 'gym', date: '2026-10-07', createdAt: 'c', session: 'arme', exercise: 'copenhagen_plank', sets: 3, reps: 30, weight: 0 },
  ]);
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines[0], 'datum;art;einheit;uebung;saetze;wiederholungen;wdh_einheit;gewicht_kg;gewicht_art');
  assert.equal(lines[1], '2026-10-05;gym;Oberkörper A;Klimmzüge;4;5;Wdh;2,5;Zusatzgewicht');
  assert.equal(lines[2], '2026-10-07;gym;Arme + Core;Trizeps Seilzug;4;12;Wdh;21,25;gesamt');
  assert.equal(lines[3], '2026-10-07;gym;Arme + Core;Copenhagen Plank;3;30;s / Seite;0;Zusatzgewicht');
});

test('CSV: Übungen ohne Gewicht haben ein leeres Gewichtsfeld; leere Liste = nur Kopfzeile', () => {
  const csv = toCSV([{ type: 'gym', date: '2026-10-10', session: 'uk', exercise: 'box_jump', sets: 3, reps: 3, weight: null }]);
  assert.equal(csv.split('\r\n')[1], '2026-10-10;gym;Sprünge + Unterkörper;Box Jump;3;3;Wdh;;ohne');
  assert.equal(toCSV([]).trimEnd().split('\r\n').length, 1);
});

test('Freier Tag ohne Einträge zeigt keine Einheit (Fehler "Dienstag mit Übungen")', () => {
  assert.equal(sessionForDay({ date: '2026-10-06', planned: null, override: undefined, entries: [] }), null);
});

test('Einheit: selbst gewählt vor eingetragen vor Plan', () => {
  const entries = [{ type: 'gym', date: '2026-10-06', session: 'uk' }];
  assert.equal(sessionForDay({ date: '2026-10-05', planned: 'oka', override: undefined, entries }), 'oka');
  assert.equal(sessionForDay({ date: '2026-10-06', planned: null, override: undefined, entries }), 'uk');
  assert.equal(sessionForDay({ date: '2026-10-06', planned: null, override: 'arme', entries }), 'arme');
});
