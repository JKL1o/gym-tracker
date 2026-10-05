// Wochenübersicht: was war geplant, was wurde gemacht, was ist ausgefallen.
// Reine Logik ohne Browser – automatisch testbar.
import { SESSIONS } from './plan.js';

// Kalenderwoche nach ISO 8601 (wie in Österreich üblich): Woche 1 enthält den ersten Donnerstag.
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;          // Montag = 1 … Sonntag = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);  // Donnerstag derselben Woche
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Status eines Tages.
// day: { date, gym, football } aus plannedWeek; entries: alle Einträge; today: 'YYYY-MM-DD'
// gym:      null oder { session, planned, done, total, status }
// football: null oder { kind, minutes, planned, status }
// status: 'done' (alles), 'partial' (teilweise), 'missed' (ausgefallen), 'open' (heute/kommt noch)
export function dayStatus(day, entries, today) {
  const gymEntries = entries.filter((e) => e.type === 'gym' && e.date === day.date);
  const session = gymEntries[0]?.session ?? day.gym;
  let gym = null;
  if (session) {
    const total = SESSIONS[session]?.items.length ?? gymEntries.length;
    const done = gymEntries.length;
    let status;
    if (done > 0) status = done >= total ? 'done' : 'partial';
    else status = day.date < today ? 'missed' : 'open';
    gym = { session, planned: session === day.gym, done, total, status };
  }

  const fb = entries.find((e) => e.type === 'football' && e.date === day.date);
  let football = null;
  if (fb) {
    football = { kind: fb.kind, minutes: fb.minutes ?? null, planned: fb.kind === day.football, status: 'done' };
  } else if (day.football) {
    football = { kind: day.football, minutes: null, planned: true, status: day.date < today ? 'missed' : 'open' };
  }
  return { gym, football };
}

// Zusammenfassung der Woche: geplante vs. gemachte Einheiten und was ausgefallen ist
export function weekSummary(days, entries, today) {
  const statuses = days.map((d) => ({ day: d, ...dayStatus(d, entries, today) }));
  const gymPlanned = days.filter((d) => d.gym).length;
  const gymDone = statuses.filter((s) => s.gym && (s.gym.status === 'done' || s.gym.status === 'partial')).length;
  const footballPlanned = days.filter((d) => d.football).length;
  const footballDone = statuses.filter((s) => s.football?.status === 'done').length;
  const missed = [];
  for (const s of statuses) {
    if (s.gym?.status === 'missed') missed.push({ date: s.day.date, dayName: s.day.dayName, what: 'gym', session: s.gym.session });
    if (s.football?.status === 'missed') missed.push({ date: s.day.date, dayName: s.day.dayName, what: s.football.kind });
  }
  return { statuses, gymPlanned, gymDone, footballPlanned, footballDone, missed };
}
