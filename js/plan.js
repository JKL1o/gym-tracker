// Übungskatalog und Wochenvorlagen – übernommen aus "Claude outputs/Gym.md" (Stand 09.09.2026).
//
// load: wie das Gewicht einer Übung erfasst wird
//   'kg'   = Gewicht in kg (Langhantel, Maschine, Seilzug, einzelne Hantel)
//   'kg2'  = zwei Kurzhanteln, Gewicht pro Hand (Anzeige "2 × 14 kg")
//   'bw'   = Körpergewicht (KG), optional mit Zusatzgewicht in kg
//   'none' = ohne Gewicht (Sprünge, Sprints, Band)
// unit: was die "Wiederholungen" bei dieser Übung bedeuten: 'Wdh', 'm' (Strecke) oder 's' (Zeit)
// perSide: Wiederholungen gelten pro Seite bzw. pro Bein

export const EXERCISES = {
  klimmzuege:           { name: 'Klimmzüge',                     load: 'bw',   unit: 'Wdh' },
  schraegbank_kh:       { name: 'Schrägbankdrücken Kurzhantel',  load: 'kg2',  unit: 'Wdh' },
  lh_rudern:            { name: 'Langhantelrudern',              load: 'kg',   unit: 'Wdh' },
  dips:                 { name: 'Dips',                          load: 'bw',   unit: 'Wdh' },
  schulterdruecken_kh:  { name: 'Schulterdrücken Kurzhantel',    load: 'kg2',  unit: 'Wdh' },
  face_pull:            { name: 'Face Pull',                     load: 'kg',   unit: 'Wdh' },
  sprint_20:            { name: 'Sprint 20 m',                   load: 'none', unit: 'Wdh', note: 'im Fußballtraining' },
  preacher_curls:       { name: 'Preacher Curls',                load: 'kg',   unit: 'Wdh' },
  trizeps_seilzug:      { name: 'Trizeps Seilzug',               load: 'kg',   unit: 'Wdh' },
  hammer_curls:         { name: 'Hammer Curls',                  load: 'kg2',  unit: 'Wdh' },
  overhead_extensions:  { name: 'Overhead Extensions',           load: 'kg',   unit: 'Wdh' },
  curls_sitzen:         { name: 'Curls im Sitzen',               load: 'kg2',  unit: 'Wdh' },
  farmers_walk:         { name: 'Farmer’s Walk',                 load: 'kg2',  unit: 'm' },
  pallof_press:         { name: 'Pallof Press',                  load: 'kg',   unit: 'Wdh', perSide: true },
  side_plank:           { name: 'Side Plank mit Hüftheben',      load: 'bw',   unit: 'Wdh', perSide: true },
  copenhagen_plank:     { name: 'Copenhagen Plank',              load: 'bw',   unit: 's',   perSide: true },
  sprint_30:            { name: 'Sprint 30 m fliegend',          load: 'none', unit: 'Wdh', note: 'im Fußballtraining' },
  tbar_rudern:          { name: 'T-Bar Rudern',                  load: 'kg',   unit: 'Wdh' },
  brustpresse:          { name: 'Brustpresse',                   load: 'kg',   unit: 'Wdh' },
  lat_pulldown_eng:     { name: 'Lat Pulldown, enger Griff',     load: 'kg',   unit: 'Wdh' },
  schraegbank_maschine: { name: 'Schrägbankdrücken Maschine',    load: 'kg',   unit: 'Wdh' },
  seitheben:            { name: 'Seitheben',                     load: 'kg2',  unit: 'Wdh' },
  reverse_butterfly:    { name: 'Reverse Butterfly',             load: 'kg',   unit: 'Wdh' },
  broad_jump:           { name: 'Broad Jump',                    load: 'none', unit: 'Wdh' },
  box_jump:             { name: 'Box Jump',                      load: 'none', unit: 'Wdh' },
  kniebeuge:            { name: 'Kniebeuge',                     load: 'kg',   unit: 'Wdh' },
  bulgarian_split:      { name: 'Bulgarian Split Squat',         load: 'kg2',  unit: 'Wdh', perSide: true },
  romanian_deadlift:    { name: 'Romanian Deadlift',             load: 'kg',   unit: 'Wdh' },
  back_extension:       { name: 'Back Extension 45°',            load: 'kg',   unit: 'Wdh' },
  nordic_curl:          { name: 'Nordic Curl',                   load: 'none', unit: 'Wdh', note: 'mit Band' },
  wadenheben_einbeinig: { name: 'Wadenheben einbeinig',          load: 'bw',   unit: 'Wdh', perSide: true },
};

// Einheiten mit Planwerten. Texte (kg, Sätze, Wdh., Pause) 1:1 aus Gym.md;
// estimate = im Plan mit * markiert ("Schätzwert – beim ersten Mal messen").
// Abweichung von Gym.md: Hammer Curls, Curls im Sitzen, Seitheben, Bulgarian Split Squat
// sind laut Jalil pro Hand gemeint und daher als "2 × … kg" geführt.
export const SESSIONS = {
  oka: {
    name: 'Oberkörper A',
    items: [
      { ex: 'klimmzuege',          kg: '+2,5 kg',    sets: '4', reps: '5–8',   pause: '2–3 min' },
      { ex: 'schraegbank_kh',      kg: '2 × 14 kg',  sets: '4', reps: '8–10',  pause: '2 min', estimate: true },
      { ex: 'lh_rudern',           kg: '40 kg',      sets: '4', reps: '8–10',  pause: '2 min', estimate: true },
      { ex: 'dips',                kg: 'KG',         sets: '3', reps: '8–12',  pause: '90 s' },
      { ex: 'schulterdruecken_kh', kg: '2 × 12 kg',  sets: '3', reps: '8–10',  pause: '2 min', estimate: true },
      { ex: 'face_pull',           kg: '15 kg',      sets: '3', reps: '10–15', pause: '60 s',  estimate: true },
      { ex: 'sprint_20',           kg: '—',          sets: '4', reps: '1',     pause: '3 min' },
    ],
  },
  arme: {
    name: 'Arme + Core',
    items: [
      { ex: 'dips',                kg: 'KG',         sets: '3', reps: '8–12',        pause: '90 s' },
      { ex: 'preacher_curls',      kg: '37,5 kg',    sets: '4', reps: '8–12',        pause: '90 s' },
      { ex: 'trizeps_seilzug',     kg: '21,25 kg',   sets: '4', reps: '10–15',       pause: '90 s' },
      { ex: 'hammer_curls',        kg: '2 × 16 kg',     sets: '3', reps: '8–12',        pause: '60 s' },
      { ex: 'overhead_extensions', kg: '17,5 kg',    sets: '3', reps: '10–15',       pause: '60 s' },
      { ex: 'curls_sitzen',        kg: '2 × 12 kg',    sets: '3', reps: '10–12',       pause: '60 s' },
      { ex: 'farmers_walk',        kg: '2 × 15 kg',  sets: '3', reps: '40 m',        pause: '60 s' },
      { ex: 'pallof_press',        kg: '10 kg',      sets: '3', reps: '12 / Seite',  pause: '60 s', estimate: true },
      { ex: 'side_plank',          kg: 'KG',         sets: '3', reps: '10 / Seite',  pause: '45 s' },
      { ex: 'copenhagen_plank',    kg: 'KG',         sets: '3', reps: '30 s / Seite', pause: '45 s' },
      { ex: 'sprint_30',           kg: '—',          sets: '3', reps: '1',           pause: '4 min' },
    ],
  },
  okb: {
    name: 'Oberkörper B',
    items: [
      { ex: 'tbar_rudern',          kg: '100 kg', sets: '1 + 3', reps: '6–8',   pause: '2–3 min' },
      { ex: 'brustpresse',          kg: '40 kg',  sets: '1 + 3', reps: '8–12',  pause: '2 min' },
      { ex: 'lat_pulldown_eng',     kg: '70 kg',  sets: '3',     reps: '10–12', pause: '90 s' },
      { ex: 'schraegbank_maschine', kg: '50 kg',  sets: '3',     reps: '8–12',  pause: '90 s' },
      { ex: 'seitheben',            kg: '2 × 8 kg', sets: '3',     reps: '12–15', pause: '60 s' },
      { ex: 'reverse_butterfly',    kg: '54 kg',  sets: '3',     reps: '12–15', pause: '60 s' },
    ],
  },
  uk: {
    name: 'Sprünge + Unterkörper',
    note: 'Nach 90 Minuten Einsatz: Sätze halbieren, Sprünge und Nordic Curl weglassen.',
    items: [
      { ex: 'broad_jump',           kg: '—',     sets: '3', reps: '3',          pause: '2 min' },
      { ex: 'box_jump',             kg: '—',     sets: '3', reps: '3',          pause: '2 min' },
      { ex: 'kniebeuge',            kg: '40 kg', sets: '4', reps: '6–8',        pause: '3 min' },
      { ex: 'bulgarian_split',      kg: '2 × 10 kg', sets: '3', reps: '8 / Bein',   pause: '90 s' },
      { ex: 'romanian_deadlift',    kg: '40 kg', sets: '3', reps: '8',          pause: '2 min' },
      { ex: 'back_extension',       kg: '15 kg', sets: '3', reps: '12–15',      pause: '90 s' },
      { ex: 'nordic_curl',          kg: 'Band',  sets: '2', reps: '5',          pause: '2 min' },
      { ex: 'wadenheben_einbeinig', kg: 'KG',    sets: '3', reps: '10 / Bein',  pause: '90 s' },
    ],
  },
};

// Wochenvorlagen. Index 0 = Montag … 6 = Sonntag.
// gym: Schlüssel aus SESSIONS oder null; football: 'training', 'match' oder null.
export const WEEK_TYPES = {
  normal: {
    label: 'Match Freitag',
    days: [
      { gym: 'oka',  football: 'training' }, // Mo
      { gym: null,   football: null },       // Di
      { gym: 'arme', football: 'training' }, // Mi
      { gym: 'okb',  football: 'training' }, // Do
      { gym: null,   football: 'match' },    // Fr
      { gym: 'uk',   football: null },       // Sa
      { gym: null,   football: null },       // So
    ],
  },
  samstagsmatch: {
    // Gym.md: "Match am Samstag: Training Mo/Mi/Fr, Unterkörper auf Dienstag."
    label: 'Match Samstag',
    days: [
      { gym: 'oka',  football: 'training' }, // Mo
      { gym: 'uk',   football: null },       // Di
      { gym: 'arme', football: 'training' }, // Mi
      { gym: 'okb',  football: null },       // Do
      { gym: null,   football: 'training' }, // Fr
      { gym: null,   football: 'match' },    // Sa
      { gym: null,   football: null },       // So
    ],
  },
};

export const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Montag der Woche, in der `date` liegt (lokale Zeit, 00:00 Uhr).
export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): 0 = Sonntag … 6 = Samstag → umrechnen auf 0 = Montag … 6 = Sonntag
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

// Datum als "YYYY-MM-DD" in lokaler Zeit (toISOString würde auf UTC umrechnen
// und kurz nach Mitternacht den Vortag liefern).
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Geplante Woche ab `monday` nach Vorlage `type` ('normal' | 'samstagsmatch').
export function plannedWeek(type, monday) {
  const template = WEEK_TYPES[type];
  if (!template) throw new Error(`Unbekannter Wochentyp: ${type}`);
  return template.days.map((day, i) => {
    // setDate statt +24h rechnen, damit die Zeitumstellung keinen Tag verschiebt
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { date: toISODate(date), dayName: DAY_NAMES[i], gym: day.gym, football: day.football };
  });
}
