// Datenaufbereitung für die Diagramme – reine Logik ohne Browser, automatisch testbar.
import { EXERCISES, mondayOf, toISODate } from './plan.js';
import { isoWeek } from './week.js';

// Übungen mit Gewicht, zu denen es Einträge gibt – zuletzt trainierte zuerst
export function exercisesWithData(entries) {
  const last = new Map();
  for (const e of entries) {
    if (e.type !== 'gym' || !EXERCISES[e.exercise] || EXERCISES[e.exercise].load === 'none') continue;
    if (!last.has(e.exercise) || e.date > last.get(e.exercise)) last.set(e.exercise, e.date);
  }
  return [...last.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]) || EXERCISES[a[0]].name.localeCompare(EXERCISES[b[0]].name))
    .map(([id]) => ({ id, name: EXERCISES[id].name, load: EXERCISES[id].load }));
}

// Gewichtsverlauf einer Übung: [{ date, value, sets, reps }] nach Datum aufsteigend.
// value = kg (bei Kurzhanteln pro Hand, bei Körpergewicht das Zusatzgewicht)
export function exerciseSeries(entries, exerciseId) {
  return entries
    .filter((e) => e.type === 'gym' && e.exercise === exerciseId && typeof e.weight === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, value: e.weight, sets: e.sets, reps: e.reps }));
}

// Körpergewicht: [{ date, value }] nach Datum aufsteigend
export function bodyweightSeries(entries) {
  return entries
    .filter((e) => e.type === 'bodyweight')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, value: e.kg }));
}

// Einheiten pro Woche für die letzten `weeks` Wochen (inkl. der aktuellen), älteste zuerst.
// Gym = Tage mit mindestens einer eingetragenen Übung; Fußball = Tage mit Training oder Match.
export function weeklyCounts(entries, today, weeks = 8) {
  const currentMonday = mondayOf(new Date(`${today}T12:00:00`));
  const result = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - 7 * i);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const from = toISODate(monday);
    const to = toISODate(sunday);
    const inWeek = (e) => e.date >= from && e.date <= to;
    const gymDays = new Set(entries.filter((e) => e.type === 'gym' && inWeek(e)).map((e) => e.date));
    const footballDays = new Set(entries.filter((e) => e.type === 'football' && inWeek(e)).map((e) => e.date));
    result.push({ from, kw: isoWeek(monday), gym: gymDays.size, football: footballDays.size });
  }
  return result;
}

// Runde Achsenwerte zwischen min und max, z. B. 40 / 45 / 50 (etwa `count` Stück)
export function niceTicks(min, max, count = 4) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.05);
    min -= pad;
    max += pad;
  }
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}
