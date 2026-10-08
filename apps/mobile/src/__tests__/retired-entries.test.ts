// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * The screens taken off the surface (ADR-069 #3, K-953) keep their code and lose every way in: no file outside them names
 * their route, and the parts that would lead there (the coach bar and chips, the projection's entry) are used only by
 * retired screens. With the AI off nothing leads to the coach or the meal photo either (K-909).
 */
import * as fs from 'fs';
import * as path from 'path';

import { RETIRED } from '@/navigation/tabs';

const SRC = path.resolve(__dirname, '..');
const APP = path.join(SRC, 'app');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : files(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const retiredScreens = new Set(RETIRED.map((name) => path.join(APP, `${name}.tsx`)));
const routeOf = new RegExp(`['"\`]/(${RETIRED.join('|')})(?=['"\`?/])`);
const relative = (file: string) => path.relative(SRC, file);

/** Files that name a retired route but are not retired screens: the parts that led there. */
const leads = files(SRC).filter((file) => !retiredScreens.has(file) && routeOf.test(fs.readFileSync(file, 'utf8')));

test('the scan sees a route named in each quote style', () => {
  for (const sample of [`'/coach'`, `"/why"`, '`/ledger?id=1`', `{ pathname: '/what-if', params }`]) expect(routeOf.test(sample)).toBe(true);
  expect(routeOf.test(`'/coach-notes'`)).toBe(false);
  expect(routeOf.test(`'/weigh-in'`)).toBe(false);
});

test('every retired route is still a file: the code stays', () => {
  for (const file of retiredScreens) expect(fs.existsSync(file)).toBe(true);
});

test('the parts that led to a retired screen are used by retired screens only', () => {
  const users = files(SRC).filter((file) => !retiredScreens.has(file));
  const used = leads.filter((lead) => {
    const module = `@/${relative(lead).replace(/\.tsx?$/, '')}`;
    return users.some((file) => file !== lead && fs.readFileSync(file, 'utf8').includes(`'${module}'`));
  });
  expect(used.map(relative)).toEqual([]);
});

describe('the onboarding steps taken off the walk (ADR-072 #8, flow.ts RETIRED_STEPS)', () => {
  const ROUTES = ['foods', 'photos', 'expectations', 'apple-health'];
  const own = new Set(ROUTES.map((name) => path.join(APP, 'onboarding', `${name}.tsx`)));
  const named = new RegExp(`['"\`]/onboarding/(${ROUTES.join('|')})(?=['"\`?/])`);

  test('each is still a file: the code stays', () => {
    for (const file of own) expect(fs.existsSync(file)).toBe(true);
  });

  test('no other file names their routes', () => {
    expect(named.test(`router.push('/onboarding/photos')`)).toBe(true);
    expect(named.test(`'/onboarding/photos-later'`)).toBe(false);
    const leading = files(SRC).filter((file) => !own.has(file) && named.test(fs.readFileSync(file, 'utf8')));
    expect(leading.map(relative)).toEqual([]);
  });
});
