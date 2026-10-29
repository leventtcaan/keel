/**
 * The Food page as a day navigator (K-1063, ADR-090 Ek 3): chevrons and a strip of the last 30 days with a dot on the days that have
 * meals; the day shown is read (budget, meals, the day before), its meals are listed with each item's amount and one kcal number,
 * an item is deleted by swipe (VoiceOver: the custom action) with Undo in the app's banner, a whole meal from its menu, and the way to
 * log into the day shown — a past day too — and to copy a day's meals into it is one tap.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import FoodScreen from '@/app/food';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

import { WithSaved, banner, undoButton } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const NUTRIENTS = (kcal: [number, number], p: [number, number], c: [number, number], f: [number, number]) => ({
  kcal: R(...kcal),
  proteinG: R(...p),
  carbsG: R(...c),
  fatG: R(...f),
});

const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 0).toISOString();
const item = (name: string, kcal: [number, number], amount: Schemas['Amount'] = { quantity: 1, unit: '1 large' }): Schemas['EstimatedItem'] => ({
  foodId: `f-${name}`,
  name,
  amount,
  kcal: R(...kcal),
  proteinG: R(5, 7),
});
const meal = (id: string, day: number, hour: number, slot: Schemas['MealSlot'], items: Schemas['EstimatedItem'][]): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt: at(day, hour),
  slot,
  items,
  kcal: R(items.reduce((sum, i) => sum + i.kcal.low, 0), items.reduce((sum, i) => sum + i.kcal.high, 0)),
  proteinG: R(10, 14),
});

const BREAKFAST = meal('b1', 29, 8, 'BREAKFAST', [item('Egg', [68, 76]), item('Toast', [80, 100], { quantity: 2, unit: '1 slice' })]);
const OLD_LUNCH = meal('l1', 25, 12, 'LUNCH', [item('Rice', [200, 240], { quantity: 150, unit: 'g' })]);

let mockMeals: Record<string, Schemas['Meal'][]> = {};
let mockDays: Schemas['DaySummary'][] = [];
let mockPatch: () => Promise<Answer> = async () => ok(BREAKFAST);
let mockDelete: () => Promise<Answer> = async () => ({ response: new Response(null, { status: 204 }) });
const calls: string[] = [];
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string; from?: string }; path?: { day?: string } } }) => {
  calls.push(path);
  if (path === '/v1/meals') {
    const query = init?.params?.query;
    if (query?.day !== undefined) return ok(mockMeals[query.day] ?? []);
    return ok(Object.values(mockMeals).flat());
  }
  if (path === '/v1/days') return ok(mockDays);
  if (path === '/v1/days/{day}/budget') {
    return ok({
      day: init?.params?.path?.day,
      targetKcal: 2400,
      targetProteinG: 150,
      eaten: NUTRIENTS([700, 800], [40, 50], [60, 80], [20, 30]),
      left: { kcal: R(1600, 1700), proteinG: R(100, 110) },
    });
  }
  if (path === '/v1/targets') return ok({ targetKcal: 2400, proteinG: 150, carbsG: 250, fatG: 70, stepsPerDay: 8000, trainingSessionsPerWeek: 3 });
  return refused(404, 'NOT_FOUND');
});
const mockPATCH = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(`PATCH ${path}`);
  return mockPatch();
});
const mockDELETE = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(`DELETE ${path}`);
  return mockDelete();
});
const mockPush = jest.fn();
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockForget = jest.fn(async (_clientId: string) => {});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to), back: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
const mockServices = {
  api: { GET: mockGET, PATCH: mockPATCH, DELETE: mockDELETE },
  queue: { record: mockRecord, drain: async () => {} },
  mealRecords: async () => [],
  consents: { granted: async () => true },
  forgetRecord: mockForget,
  takeBack: jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>) => {
    await remove('srv-1');
    return 'taken' as const;
  }),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 13, 0),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  mockMeals = { '2026-09-29': [BREAKFAST], '2026-09-25': [OLD_LUNCH] };
  mockDays = [
    { day: '2026-09-25', meals: 1, eaten: NUTRIENTS([200, 240], [4, 5], [40, 50], [0, 1]) },
    { day: '2026-09-29', meals: 1, eaten: NUTRIENTS([148, 176], [10, 14], [20, 30], [5, 8]) },
  ];
  mockPatch = async () => ok(BREAKFAST);
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <FoodScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (node: Parameters<typeof fireEvent.press>[0]) => act(async () => fireEvent.press(node));
// VoiceOver's custom action on the row (the swipe's twin). Called on the prop: a row that is a gesture responder is, to the test library,
// a disabled target for any event but a touch.
const swipeAway = async (testID: string) =>
  act(async () => (screen.getByTestId(testID).props as { onAccessibilityAction: (event: object) => void }).onAccessibilityAction({ nativeEvent: { actionName: 'delete' } }));
const kcal = (value: number) => t('food.single.kcal', { value });

describe('the day navigator', () => {
  test('opens on today; the strip holds the last 30 days, a dot on the days with meals', async () => {
    await show();
    expect(screen.getByTestId('day-label')).toHaveTextContent(t('food.day.today'));
    expect(screen.getByTestId('day-2026-09-29')).toBeSelected();
    expect(screen.getByTestId('day-2026-08-31')).toBeOnTheScreen(); // 29 days before today: the strip's first
    expect(screen.queryByTestId('day-2026-08-30')).toBeNull();
    expect(screen.getByRole('button', { name: `${t('food.day.yesterday')}` })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: new RegExp(t('food.day.hasMeals')) })).toHaveLength(2); // the 25th and today
    // Nothing after today.
    expect(screen.getByTestId('day-after')).toBeDisabled();
  });

  test('the chevron goes a day back: that day is read (its budget, its meals, the day before it) and named', async () => {
    await show();
    await press(screen.getByTestId('day-before'));
    expect(screen.getByTestId('day-label')).toHaveTextContent(t('food.day.yesterday'));
    expect(mockGET).toHaveBeenCalledWith('/v1/days/{day}/budget', { params: { path: { day: '2026-09-28' } } });
    expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-28' } } });
    expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-27' } } });
    expect(screen.getByTestId('day-after')).toBeEnabled();
  });

  test('a day of the strip shows its meals, with each item\'s amount and one kcal number, and its totals', async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-25'));
    expect(screen.getByTestId('day-label')).toHaveTextContent('Fri, Sep 25');
    expect(screen.getByRole('header', { name: t('food.slot.LUNCH') })).toBeOnTheScreen();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
    expect(screen.getByText('150 g')).toBeOnTheScreen();
    expect(screen.getAllByText(kcal(220)).length).toBeGreaterThan(0);
    expect(screen.getByText(t('food.totals.left', { value: '1,650', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
    expect(screen.getByText('45 / 150 g')).toBeOnTheScreen();
  });

  test('today\'s items say their amount in the portion\'s words: "1 large", "2 × 1 slice"', async () => {
    await show();
    expect(screen.getByText('1 large')).toBeOnTheScreen();
    expect(screen.getByText('2 × 1 slice')).toBeOnTheScreen();
    expect(screen.getByText(kcal(72))).toBeOnTheScreen();
    expect(screen.getByText(kcal(90))).toBeOnTheScreen();
  });

  test('logging goes into the day shown: today\'s button, or a past day\'s, with the day in the link', async () => {
    await show();
    await press(screen.getByRole('button', { name: t('food.log') }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { day: '2026-09-29' } });
    await press(screen.getByTestId('day-2026-09-25'));
    await press(screen.getByRole('button', { name: t('food.logDay') }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { day: '2026-09-25' } });
  });

  test('an item opens its correction; the plus of a meal adds to its slot of that day', async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-25'));
    await press(screen.getByTestId('item-l1-0'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { edit: 'l1', day: '2026-09-25', item: '0' } });
    await press(screen.getByRole('button', { name: t('food.meals.addTo', { slot: t('food.slot.LUNCH') }) }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { day: '2026-09-25', slot: 'LUNCH' } });
  });

  test('a day without meals says so in its own words; the slots of the user\'s day each offer an add', async () => {
    mockMeals = {};
    await show();
    await press(screen.getByTestId('day-before'));
    expect(screen.getByText(t('food.meals.noneDay'))).toBeOnTheScreen();
    await press(screen.getByTestId('empty-DINNER'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { day: '2026-09-28', slot: 'DINNER' } });
  });
});

describe('deleting where it stands, with Undo', () => {
  test('an item swiped away: the meal is changed in place without it, and the banner offers Undo, which puts the meal back as it was', async () => {
    await show();
    await swipeAway('swipe-b1-0');
    expect(mockPATCH).toHaveBeenCalledWith('/v1/meals/{id}', {
      params: { path: { id: 'b1' } },
      body: { items: [{ foodId: 'f-Toast', amount: { quantity: 2, unit: '1 slice' } }] },
    });
    expect(mockDELETE).not.toHaveBeenCalled();
    expect(within(banner()!).getByText(t('food.deleted.itemLead'))).toBeOnTheScreen();
    expect(within(banner()!).getByText('Egg')).toBeOnTheScreen();
    expect(within(banner()!).queryByText(t('undoBanner.saved'))).toBeNull();

    mockPATCH.mockClear();
    await press(undoButton());
    expect(mockPATCH).toHaveBeenCalledWith('/v1/meals/{id}', {
      params: { path: { id: 'b1' } },
      body: {
        items: [
          { foodId: 'f-Egg', amount: { quantity: 1, unit: '1 large' } },
          { foodId: 'f-Toast', amount: { quantity: 2, unit: '1 slice' } },
        ],
      },
    });
    expect(banner()).toBeNull();
  });

  test('the last item of a meal is the meal: it is deleted, its phone copy forgotten, and Undo logs it again at its own time', async () => {
    mockMeals = { '2026-09-29': [meal('s1', 29, 11, 'SNACK', [item('Apple', [90, 100], { quantity: 1, unit: '1 medium' })])] };
    await show();
    await swipeAway('swipe-s1-0');
    expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 's1' } } });
    expect(mockForget).toHaveBeenCalledWith('c-s1');
    expect(within(banner()!).getByText(t('food.deleted.lead'))).toBeOnTheScreen();
    expect(within(banner()!).getByText(t('food.slot.SNACK'))).toBeOnTheScreen();
    await press(undoButton());
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: at(29, 11), slot: 'SNACK', items: [{ foodId: 'f-Apple', amount: { quantity: 1, unit: '1 medium' } }] },
    });
  });

  test('a whole meal from its menu, in a system action sheet: Delete meal deletes it with Undo; Cancel changes nothing', async () => {
    await show();
    await press(screen.getByTestId('menu-BREAKFAST'));
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0] as [string, string | undefined, AlertButton[]];
    expect(title).toBe(t('food.slot.BREAKFAST'));
    expect(buttons.map((b) => b.text)).toEqual([t('food.meals.deleteMeal'), t('food.meals.cancel')]); // today: no "log again today"
    await act(async () => buttons.find((b) => b.style === 'cancel')?.onPress?.());
    expect(mockDELETE).not.toHaveBeenCalled();
    await act(async () => buttons.find((b) => b.style === 'destructive')?.onPress?.());
    expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'b1' } } });
    expect(within(banner()!).getByText(t('food.deleted.lead'))).toBeOnTheScreen();
    expect(within(banner()!).getByText(t('food.slot.BREAKFAST'))).toBeOnTheScreen();
  });

  test('on a past day the meal menu also logs it again today', async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-25'));
    await press(screen.getByTestId('menu-LUNCH'));
    const [, , buttons] = alert.mock.calls[0] as [string, string | undefined, AlertButton[]];
    expect(buttons.map((b) => b.text)).toEqual([t('food.meals.logToday'), t('food.meals.deleteMeal'), t('food.meals.cancel')]);
    await act(async () => buttons[0].onPress?.());
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(), slot: 'LUNCH', repeatOf: 'l1' },
    });
  });

  test('offline: nothing is deleted and it says a connection is needed; a server error says it could not', async () => {
    mockPatch = async () => {
      throw new TypeError('Network request failed');
    };
    await show();
    await swipeAway('swipe-b1-0');
    expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
    expect(banner()).toBeNull();
    mockPatch = async () => refused(500, 'INTERNAL');
    await swipeAway('swipe-b1-0');
    expect(screen.getByText(t('food.deleted.failed'))).toBeOnTheScreen();
  });
});

describe("copy a day's meals", () => {
  test('lists the other days that have meals, newest first; one tap copies each meal of that day into the day shown, at its time of day', async () => {
    await show();
    await press(screen.getByRole('button', { name: t('food.copy.open') }));
    expect(screen.queryByTestId('copy-2026-09-29')).toBeNull(); // not the day it is copying into
    mockMeals['2026-09-25'] = [OLD_LUNCH, meal('d1', 25, 19, 'DINNER', [item('Soup', [150, 170])])];
    await press(screen.getByTestId('copy-2026-09-25'));
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(mockRecord).toHaveBeenNthCalledWith(1, {
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(), slot: 'LUNCH', repeatOf: 'l1' },
    });
    expect(screen.getByText(t('food.copy.saved', { count: 2 }))).toBeOnTheScreen();
  });

  test('into a past day, each copy keeps its own time of day', async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-27'));
    await press(screen.getByRole('button', { name: t('food.copy.open') }));
    await press(screen.getByTestId('copy-2026-09-25'));
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 27, 12, 0).toISOString(), slot: 'LUNCH', repeatOf: 'l1' },
    });
  });

  test('Undo takes every copied meal back', async () => {
    await show();
    await press(screen.getByRole('button', { name: t('food.copy.open') }));
    await press(screen.getByTestId('copy-2026-09-25'));
    await press(undoButton());
    expect(mockServices.takeBack).toHaveBeenCalledTimes(1);
  });
});

describe('same as the day before', () => {
  test('a past day offers the day before it for its empty slots, and logs into that day', async () => {
    mockMeals = { '2026-09-26': [meal('p1', 26, 12, 'LUNCH', [item('Pasta', [400, 460], { quantity: 200, unit: 'g' })])], '2026-09-27': [] };
    await show();
    await press(screen.getByTestId('day-2026-09-27'));
    expect(screen.getByText(t('food.repeat.titleDay'))).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Pasta' }) }));
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 27, 12, 0).toISOString(), slot: 'LUNCH', repeatOf: 'p1' },
    });
  });
});

describe('first-day rough edges (K-1066)', () => {
  const LATER = meal('b2', 29, 10, 'BREAKFAST', [item('Oats', [150, 170], { quantity: 50, unit: 'g' })]);

  test('two logs of the same slot are one section: one header, every log\'s items, the slot total is their sum', async () => {
    mockMeals = { '2026-09-29': [BREAKFAST, LATER] };
    await show();
    expect(screen.getAllByRole('header', { name: t('food.slot.BREAKFAST') })).toHaveLength(1);
    expect(screen.getAllByTestId(/^meal-/)).toHaveLength(1);
    for (const name of ['Egg', 'Toast', 'Oats']) expect(screen.getByText(name)).toBeOnTheScreen();
    // 72 + 90 + 160 (the middle of each range), once, in the header
    expect(screen.getByText(kcal(322))).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: t('food.meals.addTo', { slot: t('food.slot.BREAKFAST') }) })).toHaveLength(1);
    // each item still acts on its own log
    await press(screen.getByTestId('item-b2-0'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal', params: { edit: 'b2', day: '2026-09-29', item: '0' } });
  });

  test('the slot menu deletes every log of the slot, and one Undo logs them all again at their own times', async () => {
    mockMeals = { '2026-09-29': [BREAKFAST, LATER] };
    await show();
    await press(screen.getByTestId('menu-BREAKFAST'));
    const [, , buttons] = alert.mock.calls[0] as [string, string | undefined, AlertButton[]];
    await act(async () => buttons.find((b) => b.style === 'destructive')?.onPress?.());
    expect(mockDELETE).toHaveBeenCalledTimes(2);
    expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'b1' } } });
    expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'b2' } } });
    expect(within(banner()!).getByText(t('food.deleted.lead'))).toBeOnTheScreen();
    await press(undoButton());
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ eatenAt: at(29, 8), slot: 'BREAKFAST' }) }));
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ eatenAt: at(29, 10), slot: 'BREAKFAST' }) }));
  });

  test('the title is the day: "Today\'s food", "Yesterday\'s food", else the date', async () => {
    await show();
    expect(screen.getByRole('header', { name: t('screens.food.title') })).toBeOnTheScreen();
    await press(screen.getByTestId('day-before'));
    expect(screen.getByRole('header', { name: t('food.day.titleYesterday') })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: t('screens.food.title') })).toBeNull();
    await press(screen.getByTestId('day-2026-09-25'));
    // The title and the navigator's own label both name the day.
    expect(screen.getAllByRole('header', { name: 'Fri, Sep 25' })).toHaveLength(2);
  });

  test('a quick add says its name once', async () => {
    const quick = meal('q1', 29, 15, 'SNACK', [{ ...item('Quick add', [150, 150]), foodId: 'quick', amount: { quantity: 1, unit: 'serving' } }]);
    mockMeals = { '2026-09-29': [quick] };
    await show();
    expect(screen.getAllByText(t('meal.quickAdd.name'))).toHaveLength(1);
  });

  describe('the per-meal hint', () => {
    const days = (count: number) => {
      const all: Record<string, Schemas['Meal'][]> = {};
      for (let i = 0; i < count; i += 1) {
        const day = 29 - i;
        all[`2026-09-${day}`] = [meal(`h${i}`, day, 8, 'BREAKFAST', [item('Egg', [70, 80])]), meal(`k${i}`, day, 19, 'DINNER', [item('Rice', [200, 240])])];
      }
      return all;
    };
    const hint = () => t('food.totals.hint', { count: 2, kcal: '1,200' });

    test('with the first day only, nothing is said of what a meal is', async () => {
      mockMeals = days(1);
      await show();
      expect(screen.queryByText(hint())).toBeNull();
      expect(screen.queryByText(/meals a day/)).toBeNull();
    });

    test('from the third day of the user\'s own pattern it is said', async () => {
      mockMeals = days(3);
      await show();
      expect(screen.getByText(hint())).toBeOnTheScreen();
    });
  });
});
