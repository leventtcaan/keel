/**
 * Units (K-310, ADR-029): the server and the engine are metric; the phone shows and takes the user's units and rounds
 * once, to what the server keeps. Round trips are checked over every value a user can type, not a few examples.
 */
import {
  defaultSystem,
  formatHeight,
  formatLoad,
  loadValue,
  volumeValue,
  formatPlate,
  formatWaist,
  formatWeight,
  heightCmFromImperial,
  parseLoadKg,
  parseWaistCm,
  parseWeightKg,
  roundTo,
  weightInput,
  weightStepKg,
} from '@/units/units';

const tenths = (from: number, to: number) => Array.from({ length: Math.round((to - from) * 10) + 1 }, (_, i) => (from * 10 + i) / 10);

describe('rounding', () => {
  test('half away from zero, without binary surprises', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(81.455, 2)).toBe(81.46);
    expect(roundTo(81.444, 2)).toBe(81.44);
    expect(roundTo(2.5, 0)).toBe(3);
  });
});

describe('body weight', () => {
  test('one shown step, in kg: a tenth of a kilo, a tenth of a pound', () => {
    expect(weightStepKg('METRIC')).toBeCloseTo(0.1, 10);
    expect(weightStepKg('IMPERIAL')).toBeCloseTo(0.045359237, 10);
  });

  test('metric: shown to one decimal', () => {
    expect(formatWeight(81.46, 'METRIC')).toBe('81.5 kg');
    expect(formatWeight(80, 'METRIC')).toBe('80.0 kg');
  });

  test('imperial: kg shown as lb to one decimal', () => {
    expect(formatWeight(81.65, 'IMPERIAL')).toBe('180.0 lb');
  });

  test('typed in lb, stored in kg to 2 decimals (the server keeps 2)', () => {
    expect(parseWeightKg('180', 'IMPERIAL')).toBe(81.65);
    expect(parseWeightKg('81.456', 'METRIC')).toBe(81.46);
  });

  test('every weight typed in lb (0.1 steps, 50–700) comes back the same after the trip through kg', () => {
    const wrong = tenths(50, 700).filter((lb) => {
      const kg = parseWeightKg(lb.toFixed(1), 'IMPERIAL');
      return kg === null || weightInput(kg, 'IMPERIAL') !== lb.toFixed(1);
    });
    expect(wrong).toEqual([]);
  });

  test('every weight typed in kg (0.1 steps, 25–320) comes back the same', () => {
    const wrong = tenths(25, 320).filter((kg) => weightInput(parseWeightKg(kg.toFixed(1), 'METRIC')!, 'METRIC') !== kg.toFixed(1));
    expect(wrong).toEqual([]);
  });

  test('a decimal comma is a decimal point (the iOS number pad types "," in Türkiye, Germany…)', () => {
    expect(parseWeightKg('81,5', 'METRIC')).toBe(81.5);
    expect(parseLoadKg('102,5', 'METRIC')).toBe(102.5);
    expect(parseWaistCm('84,5', 'METRIC')).toBe(84.5);
    expect(parseWeightKg('.5', 'METRIC')).toBe(0.5);
    expect(parseWeightKg(' 81.5 ', 'METRIC')).toBe(81.5);
  });

  test('not a weight: empty, text, zero, negative, two separators, a bare separator', () => {
    for (const text of ['81,5,0', '1.000,5', '80,', ',', '.']) expect(parseWeightKg(text, 'METRIC')).toBeNull();
    for (const text of ['', '  ', 'abc', '0', '-80', '80kg', '1e3']) expect(parseWeightKg(text, 'METRIC')).toBeNull();
  });
});

describe('loads', () => {
  test('a trailing .0 is dropped; a half is kept', () => {
    expect(formatLoad(100, 'METRIC')).toBe('100 kg');
    expect(formatLoad(102.5, 'METRIC')).toBe('102.5 kg');
  });

  test('225 lb is stored as 102.06 kg and shown as 225 lb again', () => {
    const kg = parseLoadKg('225', 'IMPERIAL');
    expect(kg).toBe(102.06);
    expect(formatLoad(kg!, 'IMPERIAL')).toBe('225 lb');
  });

  // K1 (Evre 7 C, the walk of 30 Oct: "242.5 x 10" for 110 kg): a load on the kilo grid is a target made in kilos and reads to the rack, so the
  // 15 typed half-pound loads that fall on that grid by chance (all over 100 lb, none a multiple of 5 lb) read to the nearest 5; every other
  // whole or half lb comes back as typed (ADR-029).
  test('every load typed in whole or half lb (up to 1000) comes back the same, but the few that sit on the kilo grid', () => {
    const wrong: number[] = [];
    for (let lb = 0.5; lb <= 1000; lb += 0.5) {
      if (formatLoad(parseLoadKg(String(lb), 'IMPERIAL')!, 'IMPERIAL') !== `${lb} lb`) wrong.push(lb);
    }
    expect(wrong.length).toBeLessThanOrEqual(20);
    expect(wrong.filter((lb) => lb < 100 || lb % 5 === 0)).toEqual([]);
  });

  test('every load typed in whole pounds that a gym has (a multiple of 5 up to 1000) comes back the same', () => {
    const wrong: number[] = [];
    for (let lb = 5; lb <= 1000; lb += 5) {
      if (formatLoad(parseLoadKg(String(lb), 'IMPERIAL')!, 'IMPERIAL') !== `${lb} lb`) wrong.push(lb);
    }
    expect(wrong).toEqual([]);
  });

  test('typed in kg, a load is rounded to what the server keeps too', () => {
    expect(parseLoadKg('102.456', 'METRIC')).toBe(102.46);
  });

  test('zero is a load (bodyweight moves log 0)', () => {
    expect(parseLoadKg('0', 'METRIC')).toBe(0);
  });
});

describe('a load that came from kilos is a weight a gym has (the walk of 30 Oct: "396.8 x 8", "209.4 lb", "104.7 lb")', () => {
  test.each([
    [180, '395 lb'],
    [160, '355 lb'],
    [110, '245 lb'],
    [95, '210 lb'],
    [47.5, '105 lb'],
    [4.5, '10 lb'],
    [2.3, '5 lb'],
  ])('%s kg reads %s', (kg, text) => {
    expect(formatLoad(kg, 'IMPERIAL')).toBe(text);
  });

  test('never a decimal that no plate makes: every kg load on the kilo grid (0 to 400 in 1.25 steps) reads on the rack, 2.5 lb at the lightest (110 kg is 245 lb, not 242.5; 160 kg is 355, not 352.7)', () => {
    const wrong: string[] = [];
    for (let kg = 0; kg <= 400; kg += 1.25) {
      const lb = loadValue(kg, 'IMPERIAL');
      if (lb % 2.5 !== 0 || (lb >= 10 && lb % 5 !== 0)) wrong.push(`${kg}: ${lb}`);
    }
    expect(wrong).toEqual([]);
  });

  test('a load typed in pounds off the kilo grid is shown as typed, to the half pound', () => {
    expect(formatLoad(parseLoadKg('102.5', 'IMPERIAL')!, 'IMPERIAL')).toBe('102.5 lb');
    expect(formatLoad(parseLoadKg('47.5', 'IMPERIAL')!, 'IMPERIAL')).toBe('47.5 lb');
  });

  test('kilos are as the server keeps them', () => {
    expect(formatLoad(62.5, 'METRIC')).toBe('62.5 kg');
  });

  test('a volume is a whole sum in the unit, never stepped to plates', () => {
    expect(volumeValue(570.1, 'IMPERIAL')).toBe(1257);
    expect(volumeValue(570.1, 'METRIC')).toBe(570);
  });
});

describe('waist', () => {
  test('typed in inches, stored in cm to 1 decimal', () => {
    expect(parseWaistCm('33', 'IMPERIAL')).toBe(83.8);
    expect(formatWaist(83.8, 'IMPERIAL')).toBe('33.0 in');
    expect(formatWaist(84, 'METRIC')).toBe('84.0 cm');
  });

  test('typed in cm, a waist is rounded to what the server keeps (1 decimal)', () => {
    expect(parseWaistCm('84.25', 'METRIC')).toBe(84.3);
  });

  test('every waist typed in inches (0.1 steps, 20–70) comes back the same', () => {
    const wrong = tenths(20, 70).filter((inch) => formatWaist(parseWaistCm(inch.toFixed(1), 'IMPERIAL')!, 'IMPERIAL') !== `${inch.toFixed(1)} in`);
    expect(wrong).toEqual([]);
  });
});

describe('height', () => {
  test('metric: whole centimetres', () => {
    expect(formatHeight(178, 'METRIC')).toBe('178 cm');
  });

  test('imperial: feet and inches, from whole cm', () => {
    expect(formatHeight(178, 'IMPERIAL')).toBe('5 ft 10 in');
    expect(heightCmFromImperial(5, 10)).toBe(178);
  });

  test('every height in feet and inches the profile allows (100–250 cm) comes back the same', () => {
    const wrong: string[] = [];
    for (let total = 40; total <= 98; total++) {
      const feet = Math.floor(total / 12);
      const inches = total % 12;
      if (formatHeight(heightCmFromImperial(feet, inches), 'IMPERIAL') !== `${feet} ft ${inches} in`) wrong.push(`${feet}'${inches}`);
    }
    expect(wrong).toEqual([]);
  });

  test('inches beyond 11 are not a height', () => {
    expect(() => heightCmFromImperial(5, 12)).toThrow();
  });
});

describe('the default before the user chooses', () => {
  test.each([
    ['en-US', 'IMPERIAL'],
    ['es-US', 'IMPERIAL'],
    ['en-GB', 'METRIC'],
    ['tr-TR', 'METRIC'],
    ['en', 'METRIC'],
    ['zh-Hans-US', 'IMPERIAL'],
    ['en-LR', 'IMPERIAL'],
    ['my-MM', 'IMPERIAL'],
    ['en_US', 'IMPERIAL'],
  ] as const)('%s → %s', (locale, system) => {
    expect(defaultSystem(locale)).toBe(system);
  });
});

test('a plate as its size, without the unit: kg to the hundredth, lb on the quarter pound it was entered on', () => {
  expect(formatPlate(1.25, 'METRIC')).toBe('1.25');
  expect(formatPlate(20, 'METRIC')).toBe('20');
  expect(formatPlate(0.57, 'IMPERIAL')).toBe('1.25'); // a 1.25 lb plate, stored to the hundredth of a kg
  expect(formatPlate(1.13, 'IMPERIAL')).toBe('2.5');
  expect(formatPlate(20.41, 'IMPERIAL')).toBe('45');
});

test("a load's value as it is written: 62.5 and 62.51 kg are both 140 lb (the nearest 5 lb, 137.8 to the decimal), and both 62.5 kg", () => {
  expect(loadValue(62.5, 'IMPERIAL')).toBe(140);
  expect(loadValue(62.51, 'IMPERIAL')).toBe(140);
  expect(loadValue(62.51, 'METRIC')).toBe(62.5);
  // Evre 7: the walk showed 396.8 lb, 209.4 lb. A load that came from the kilos reads as a weight a gym has (the nearest 5 lb)...
  expect(loadValue(180, 'IMPERIAL')).toBe(395);
  expect(loadValue(95, 'IMPERIAL')).toBe(210);
  expect(formatLoad(95, 'IMPERIAL')).toBe('210 lb');
  // ...under 10 lb to the nearest 2.5 lb...
  expect(loadValue(2.5, 'IMPERIAL')).toBe(5);
  // ...and a load typed in pounds comes back as typed, on or off the 5s (ADR-029: 137.5 lb and 132 lb are what the user wrote).
  expect(loadValue(parseLoadKg('137.5', 'IMPERIAL') as number, 'IMPERIAL')).toBe(137.5);
  expect(loadValue(parseLoadKg('132', 'IMPERIAL') as number, 'IMPERIAL')).toBe(132);
  // Kilos are never rounded this way.
  expect(loadValue(97.5, 'METRIC')).toBe(97.5);
  expect(loadValue(82.5, 'METRIC')).toBe(82.5);
});
