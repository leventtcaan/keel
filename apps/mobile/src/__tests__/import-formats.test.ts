/**
 * Reading another app's export on the phone (K-609, ADR-053, arastirma/ham/H13): only the headers verified from real
 * files are read — Strong's comma file, Hevy's in kg or lb — and nothing else is guessed. A session is its rows with the
 * same start; times are the phone's local time (the files carry no zone). Notes, RPE, distance and time are not read.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseCsv } from '@/import/csv';
import { readExport } from '@/import/formats';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures/import', name), 'utf8');
const local = (y: number, m: number, d: number, h: number, min: number, s = 0) => new Date(y, m - 1, d, h, min, s);

describe('csv', () => {
  test('quotes, doubled quotes, commas and line breaks inside a field, CRLF, a BOM and a last line without a break', () => {
    expect(parseCsv('﻿a,"b, c","say ""hi""",\r\n1,"two\nlines",3,')).toEqual([
      ['a', 'b, c', 'say "hi"', ''],
      ['1', 'two\nlines', '3', ''],
    ]);
  });

  test('an empty line is no row', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  test('a quote left open is not a file we can read', () => {
    expect(() => parseCsv('a,"b\n1,2')).toThrow();
  });
});

describe('Strong', () => {
  test("its comma file: sessions by start, the duration's end, sets in order, the unit not known", () => {
    const read = readExport(fixture('strong.csv'));

    expect(read.kind).toBe('read');
    if (read.kind !== 'read') return;
    expect(read.source).toBe('STRONG');
    expect(read.unit).toBeNull(); // the file does not say: the user is asked
    expect(read.sessions).toHaveLength(2);
    const [first, second] = read.sessions;
    expect(first.startedAt).toEqual(local(2025, 1, 18, 18, 5, 28));
    expect(first.endedAt).toEqual(local(2025, 1, 18, 18, 8, 48)); // 200s
    expect(first.sets).toEqual([
      { name: 'Bench Press (Barbell)', warmUp: false, weight: 20, reps: 20 },
      { name: 'Bench Press (Barbell)', warmUp: false, weight: 60, reps: 8 },
    ]);
    expect(second.startedAt).toEqual(local(2025, 1, 20, 7, 30));
    expect(second.endedAt).toEqual(local(2025, 1, 20, 8, 45)); // 1h 15m
    expect(second.sets.map((s) => s.name)).toEqual(['Squat (Barbell)', 'Deadlift (Barbell)']);
  });

  test('a row with no reps (a plank held for seconds) is left out and counted', () => {
    const read = readExport(fixture('strong.csv'));

    expect(read.kind === 'read' && read.leftOut).toBe(1);
  });

  test('a duration that cannot be read ends the session where it starts', () => {
    const csv = fixture('strong.csv').replace(/200s/g, 'about an hour');
    const read = readExport(csv);

    expect(read.kind === 'read' && read.sessions[0].endedAt).toEqual(local(2025, 1, 18, 18, 5, 28));
  });

  test('a date that is not the verified form is not guessed: the row is left out', () => {
    const csv = fixture('strong.csv').replace('2025-01-20 07:30:00', '2025-01-20 7:30:00 AM');
    const read = readExport(csv);

    expect(read.kind === 'read' && read.leftOut).toBe(2); // the plank and the one row whose date changed
  });
});

describe('Hevy', () => {
  test('kg in the header: sessions by title and start, end from the file, warm-ups marked, an empty weight is 0', () => {
    const read = readExport(fixture('hevy.csv'));

    expect(read.kind).toBe('read');
    if (read.kind !== 'read') return;
    expect(read.source).toBe('HEVY');
    expect(read.unit).toBe('kg');
    expect(read.sessions).toHaveLength(2);
    const [push, pull] = read.sessions;
    expect(push.startedAt).toEqual(local(2025, 6, 30, 19, 56));
    expect(push.endedAt).toEqual(local(2025, 6, 30, 20, 58));
    expect(push.sets).toEqual([
      { name: 'Incline Bench Press (Dumbbell)', warmUp: true, weight: 20, reps: 12 },
      { name: 'Incline Bench Press (Dumbbell)', warmUp: false, weight: 60, reps: 10 },
      { name: 'Lat Pulldown (Cable)', warmUp: false, weight: 55.5, reps: 10 },
    ]);
    expect(pull.startedAt).toEqual(local(2025, 7, 2, 7, 5));
    expect(pull.sets).toEqual([{ name: 'Pull Up', warmUp: false, weight: 0, reps: 8 }]);
  });

  test('lb in the header: the unit is lb', () => {
    const csv = fixture('hevy.csv').replace('"weight_kg"', '"weight_lbs"').replace('"distance_km"', '"distance_miles"');
    const read = readExport(csv);

    expect(read.kind === 'read' && read.unit).toBe('lb');
  });

  test('newest first in the file, oldest first here', () => {
    const lines = fixture('hevy.csv').trim().split('\r\n');
    const reversed = [lines[0], ...lines.slice(1).reverse()].join('\r\n');
    const read = readExport(reversed);

    expect(read.kind === 'read' && read.sessions.map((s) => s.startedAt)).toEqual([local(2025, 6, 30, 19, 56), local(2025, 7, 2, 7, 5)]);
  });
});

describe('what is not read', () => {
  test("a header we have not seen in a real export is not guessed at — Strong's semicolon form included", () => {
    expect(readExport('Workout #;Date;Workout Name;Duration (sec);Exercise Name;Set Order;Weight (kg);Reps\n1;2025-01-18;A;60;Squat;1;100;5')).toEqual({
      kind: 'unknown',
    });
    expect(readExport('date,exercise,kg,reps\n2025-01-18,Squat,100,5')).toEqual({ kind: 'unknown' });
    expect(readExport('')).toEqual({ kind: 'unknown' });
    expect(readExport('not a csv "at all')).toEqual({ kind: 'unknown' });
  });

  test('a known header with no set in it is empty, not unknown', () => {
    expect(readExport(fixture('strong.csv').split('\n')[0])).toEqual({ kind: 'empty' });
  });

  test('notes, RPE and the session names are not carried', () => {
    const read = readExport(fixture('strong.csv'));
    const kept = JSON.stringify(read);

    for (const word of ['heavy', 'Gym was busy', 'Training Title', 'Legs, then arms']) expect(kept).not.toContain(word);
  });
});

describe('after the review (K-609)', () => {
  const strong = (rows: string[]) => [fixture('strong.csv').split('\n')[0], ...rows].join('\n');
  const row = (reps: string, weight = '100', name = 'Squat (Barbell)', date = '2025-01-20 07:30:00') =>
    `${date},"A",45m,"${name}",1,${weight},${reps},0,0,"","",`;

  test('one rep is a set; part of a rep is not', () => {
    const read = readExport(strong([row('1'), row('5.5')]));
    expect(read.kind === 'read' && read.sessions[0].sets.map((x) => x.reps)).toEqual([1]);
    expect(read.kind === 'read' && read.leftOut).toBe(1);
  });

  test('a weight that is not a number is left out, never sent to be refused', () => {
    const read = readExport(strong([row('5', '1oo'), row('5', '"1,5"'), row('5')]));
    expect(read.kind === 'read' && read.leftOut).toBe(2);
  });

  test('a date not on the calendar is left out (30 February)', () => {
    const read = readExport(strong([row('5', '100', 'Squat (Barbell)', '2025-02-30 07:30:00'), row('5')]));
    expect(read.kind === 'read' && read.leftOut).toBe(1);
  });

  test('a name with spaces around is the name; no name is no set', () => {
    const read = readExport(strong([row('5', '100', '  Squat (Barbell) '), row('5', '100', '')]));
    expect(read.kind === 'read' && read.sessions[0].sets.map((x) => x.name)).toEqual(['Squat (Barbell)']);
    expect(read.kind === 'read' && read.leftOut).toBe(1);
  });

  test('a cut-off header is not the form', () => {
    expect(readExport('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps\n2025-01-20 07:30:00,A,45m,Squat,1,100,5').kind).toBe('unknown');
  });

  const hevy = (rows: string[]) => [fixture('hevy.csv').split('\r\n')[0], ...rows].join('\r\n');
  const hrow = (type: string, start = '30 Jun 2025, 19:56', end = '30 Jun 2025, 20:58', title = 'Push') =>
    `"${title}","${start}","${end}","","Lat Pulldown (Cable)",,"",0,"${type}",50,10,,,`;

  test("a Hevy set type other than warm-up is a working set (H13 B3)", () => {
    const read = readExport(hevy([hrow('dropset'), hrow('failure'), hrow('warmup')]));
    expect(read.kind === 'read' && read.sessions[0].sets.map((x) => x.warmUp)).toEqual([false, false, true]);
  });

  test('a Hevy end before its start ends where it starts', () => {
    const read = readExport(hevy([hrow('normal', '30 Jun 2025, 19:56', '30 Jun 2025, 18:00')]));
    expect(read.kind === 'read' && read.sessions[0].endedAt).toEqual(read.kind === 'read' && read.sessions[0].startedAt);
  });

  test('two Hevy sessions at one start with two titles are two sessions', () => {
    const read = readExport(hevy([hrow('normal', '30 Jun 2025, 19:56', '30 Jun 2025, 20:58', 'Push'), hrow('normal', '30 Jun 2025, 19:56', '30 Jun 2025, 20:58', 'Pull')]));
    expect(read.kind === 'read' && read.sessions).toHaveLength(2);
  });

  test('the weights of an lb file are read from its own column', () => {
    const csv = fixture('hevy.csv').replace('"weight_kg"', '"weight_lbs"').replace('"distance_km"', '"distance_miles"');
    const read = readExport(csv);
    expect(read.kind === 'read' && read.sessions[0].sets[1].weight).toBe(60);
  });

  test('a time with something after it is not the verified form', () => {
    const read = readExport(strong([row('5', '100', 'Squat (Barbell)', '2025-01-20 07:30:00 AM'), row('5')]));
    expect(read.kind === 'read' && read.leftOut).toBe(1);
  });
});

describe('csv, more edges', () => {
  test('a doubled quote then a comma inside the field', () => {
    expect(parseCsv('"a"",b"')).toEqual([['a",b']]);
  });
  test('a row whose first field is empty is a row', () => {
    expect(parseCsv(',x')).toEqual([['', 'x']]);
  });
  test('a one-column last line without a break', () => {
    expect(parseCsv('a\nb')).toEqual([['a'], ['b']]);
  });
  test('a lone carriage return is text', () => {
    expect(parseCsv('a\rb')).toEqual([['a\rb']]);
  });
});
