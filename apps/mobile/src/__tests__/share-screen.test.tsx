/**
 * Share your progress (K-612, L3 Y5): the user starts it; the card is made on this phone from the record, the latest call
 * and a lift — the weight trend only when turned on — and handed to the share sheet as an image. Nothing goes to the
 * server: the screen only reads (GET), and the image is never sent by the app.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ShareScreen from '@/app/share';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import type { CardText } from '@/share/card';
import { ThemeProvider } from '@/theme/theme';

type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const none: Answer = { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) };

let mockAnswers: Record<string, Answer> = {};
const mockServices = {
  api: {
    GET: jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? none),
    POST: jest.fn(),
    PUT: jest.fn(),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  },
  training: {
    read: jest.fn(async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: [] }, kept: false })),
    own: jest.fn(async () => []),
    history: jest.fn(async () => ({ state: 'ready', value: [] })),
  },
  workoutRecords: jest.fn(async () => []),
  shareImage: jest.fn(async (_base64: string) => {}),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, []),
}));
// The card as text, with the image the ref would make: the real drawing is share-card-view.test.tsx.
jest.mock('@/share/ShareCard', () => {
  const { forwardRef: mockForwardRef, useImperativeHandle: mockHandle } = jest.requireActual<typeof import('react')>('react');
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ShareCard: mockForwardRef(function MockCard({ text }: { text: CardText }, ref) {
      mockHandle(ref, () => ({ toDataURL: (done: (base64: string) => void) => done('iVBORw0KGgo=') }));
      return <MockText testID="card">{[text.heading, ...text.lines, text.footer].join('\n')}</MockText>;
    }),
  };
});

const fetchSpy = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchSpy;
  mockAnswers = {
    '/v1/consistency': ok({
      weekOf: '2026-09-28',
      training: { done: 2, planned: 3 },
      protein: { done: 5, planned: 7 },
      steps: { done: 5, planned: 7 },
      weighIns: { done: 6, planned: 7 },
      planned: 24,
      done: 18,
      record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
    }),
    '/v1/decisions/current': ok({ action: { type: 'CHANGE_MOVEMENT' }, copyKey: 'decision.change_movement.bmr_floor' }),
    '/v1/weight-trend': ok([
      { day: '2026-07-10', kg: 84.2 },
      { day: '2026-10-03', kg: 81.6 },
    ]),
  };
});
afterEach(() => {
  // The image never goes to the server: no write of any kind, no fetch of its own.
  for (const write of [mockServices.api.POST, mockServices.api.PUT, mockServices.api.PATCH, mockServices.api.DELETE]) expect(write).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <ShareScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const card = () => screen.getByTestId('card').props.children as string;

test('the card: the record and the latest call; no weight until turned on', async () => {
  await show();

  expect(card()).toContain(t('share.card.record', { onTrack: 11, counted: 12 }));
  expect(card()).toContain(t('share.card.call', { call: t('decision.change_movement.bmr_floor.title') }));
  expect(card()).not.toContain(t('share.card.weight', { days: workoutParams.evaluationWindowDays, from: '84.2 kg', to: '81.6 kg' }));
  expect(screen.getByText(t('share.note'))).toBeOnTheScreen();
});

test('turned on, the weight trend is on the card with its real values; off again, gone', async () => {
  await show();

  expect(screen.getByLabelText(t('share.showWeight')).props.value).toBe(false); // off by default
  await fireEvent(screen.getByLabelText(t('share.showWeight')), 'valueChange', true);
  await act(async () => {});
  expect(card()).toContain(t('share.card.weight', { days: workoutParams.evaluationWindowDays, from: '84.2 kg', to: '81.6 kg' }));

  await fireEvent(screen.getByLabelText(t('share.showWeight')), 'valueChange', false);
  await act(async () => {});
  expect(card()).not.toContain('84.2');
});

test('share: the image made on the phone goes to the share sheet', async () => {
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await act(async () => {});

  expect(mockServices.shareImage).toHaveBeenCalledWith('iVBORw0KGgo=');
});

test('a failure is said; reported by name only', async () => {
  mockServices.shareImage.mockRejectedValueOnce(Object.assign(new Error('weights'), { name: 'ShareFailed' }));
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await act(async () => {});

  expect(screen.getByText(t('share.failed'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'ShareFailed' });
});

test('nothing to put on a card: it says so and offers no share', async () => {
  mockAnswers = {};
  await show();

  expect(screen.getByText(t('share.nothing'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('share.share') })).toBeNull();
});
