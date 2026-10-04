/**
 * A meal from a photo (K-408, prototype: the coach's draft): the AI consent first — without it, nothing is taken and the
 * way to Settings; with it, the camera or the library, the photo shrunk and sent (photo.ts), then the server's draft:
 * each food seen with "about N g" and the database's foods to pick, one tap each; then the meal screen with the picks,
 * where the range and its one gram question are the database's (U1, U5).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MealPhotoScreen from '@/app/meal-photo';
import { t } from '@/copy';
import { handedFrom, takeMeal } from '@/food/handoff';
import { ThemeProvider } from '@/theme/theme';

type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });

const DRAFT = {
  mode: 'MODEL',
  items: [
    { food: 'rice white cooked', amount: { quantity: 180, unit: 'g', certainty: 'ESTIMATED' }, confident: true, candidates: [{ id: 'f1', name: 'Rice, white, cooked' }] },
    {
      food: 'chicken',
      amount: { quantity: 120, unit: 'g', certainty: 'ESTIMATED' },
      confident: false,
      candidates: [
        { id: 'f2', name: 'Chicken breast, grilled' },
        { id: 'f3', name: 'Chicken thigh, roasted' },
      ],
    },
  ],
};

let mockGranted = true;
let mockAnswer: Answer | 'offline' = ok(DRAFT);
let mockPicked: { uri: string } | null | 'denied' = { uri: 'file:///p.jpg' };
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockAnswer === 'offline') throw new TypeError('Network request failed');
  return mockAnswer;
});
const mockPick = jest.fn(async (_source: string) => mockPicked);
const mockShrink = jest.fn(async () => ({ base64: 'AAAA', width: 1024, height: 768, uri: 'file:///shrunk.jpg' }));
const mockDiscard = jest.fn(async (_uri: string) => {});
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn() } }));
jest.mock('@/food/photoTools', () => ({
  photoTools: { pick: (source: string) => mockPick(source), shrink: () => mockShrink(), discard: (uri: string) => mockDiscard(uri) },
}));
let mockGrantedFails = false;
const mockServices = {
  api: { POST: mockPOST },
  consents: { granted: async () => (mockGrantedFails ? Promise.reject(new Error('keychain')) : mockGranted) },
  report: () => {},
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockGrantedFails = false;
  mockAnswer = ok(DRAFT);
  mockPicked = { uri: 'file:///p.jpg' };
  takeMeal();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <MealPhotoScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

test('without the AI consent: why, and the way to Settings — nothing taken, nothing sent', async () => {
  mockGranted = false;
  await show();
  expect(screen.getByText(t('mealPhoto.consent'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('mealPhoto.camera') })).toBeNull();
  await press(t('today.consent.open'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
  expect(mockPick).not.toHaveBeenCalled();
  expect(mockPOST).not.toHaveBeenCalled();
});

test('with it: what happens to the photo, then the camera or the library', async () => {
  await show();
  expect(screen.getByText(t('mealPhoto.intro'))).toBeOnTheScreen();
  await press(t('mealPhoto.library'));
  expect(mockPick).toHaveBeenCalledWith('library');
  expect(mockPOST).toHaveBeenCalledWith('/v1/meals/photo', { body: { image: 'AAAA' } });
});

test('the draft: each food seen, about how much, the database’s foods to pick — no number of what it holds (U1)', async () => {
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.item', { food: 'rice white cooked', quantity: '180' }))).toBeOnTheScreen();
  expect(screen.getByText(t('mealPhoto.item', { food: 'chicken', quantity: '120' }))).toBeOnTheScreen();
  expect(screen.queryByText(/kcal/i)).toBeNull();
  // An unsure food asks: nothing can be logged until it is picked.
  expect(screen.getByRole('button', { name: t('coach.meal.log') })).toBeDisabled();
  await act(async () => fireEvent.press(screen.getByText('Chicken breast, grilled')));
  await press(t('coach.meal.log'));
  expect(mockReplace).toHaveBeenCalledWith('/meal');
  expect(handedFrom()).toBe('photo');
  expect(takeMeal()).toEqual([
    { foodId: 'f1', name: 'Rice, white, cooked', quantity: 180, unit: 'g' },
    { foodId: 'f2', name: 'Chicken breast, grilled', quantity: 120, unit: 'g' },
  ]);
});

test('no meal found: said so, and logging by name', async () => {
  mockAnswer = ok({ mode: 'DETERMINISTIC', items: [] });
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.unread'))).toBeOnTheScreen();
  await press(t('coach.meal.byName'));
  expect(mockReplace).toHaveBeenCalledWith('/meal');
  expect(takeMeal()).toBeNull();
});

test('backed out of the camera: the screen as it was, nothing sent', async () => {
  mockPicked = null;
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByRole('button', { name: t('mealPhoto.camera') })).toBeOnTheScreen();
  expect(mockPOST).not.toHaveBeenCalled();
});

test('the camera not allowed: said so, the library still offered', async () => {
  mockPicked = 'denied';
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.denied'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('mealPhoto.library') })).toBeOnTheScreen();
});

test('offline or unreadable: said so, try again', async () => {
  mockAnswer = 'offline';
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.failed'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('mealPhoto.camera') })).toBeOnTheScreen();
});

test('a consent the phone cannot read is not given: the consent step, not a blank screen', async () => {
  mockGrantedFails = true;
  await show();
  expect(screen.getByText(t('mealPhoto.consent'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('mealPhoto.camera') })).toBeNull();
});

test('the server’s consent answer: the consent step, the camera gone', async () => {
  mockAnswer = { error: { code: 'CONSENT_REQUIRED', message: 'x' }, response: new Response(null, { status: 403 }) };
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByRole('button', { name: t('today.consent.open') })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('mealPhoto.camera') })).toBeNull();
});

test('the server’s subscription answer (K-703): why, and the way to the plans — the camera gone', async () => {
  mockAnswer = { error: { code: 'ENTITLEMENT_REQUIRED', message: 'x' }, response: new Response(null, { status: 403 }) };
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.subscription'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('mealPhoto.camera') })).toBeNull();
  await press(t('subscription.seePlans'));
  expect(mockPush).toHaveBeenCalledWith('/paywall');
});

test('while it reads, it says so and nothing can be taken again (a second tap would use a second analysis)', async () => {
  let answer: (value: Answer) => void = () => {};
  mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
  await show();
  await press(t('mealPhoto.camera'));
  expect(screen.getByText(t('mealPhoto.reading'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('mealPhoto.camera') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('mealPhoto.library') })).toBeNull();
  await act(async () => answer(ok(DRAFT)));
  expect(screen.getByText(t('mealPhoto.item', { food: 'chicken', quantity: '120' }))).toBeOnTheScreen();
  expect(mockPOST).toHaveBeenCalledTimes(1);
});
