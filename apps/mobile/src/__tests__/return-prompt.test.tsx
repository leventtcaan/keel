/**
 * When the return question is asked (K-981, ADR-077 #5 and Ek 6): on opening the app, and on coming back to it, the phone
 * asks the server (GET /v1/return) and opens the return screen only when the server says `shouldPrompt`. It counts no
 * days and knows no gap. It does not step in front of something the person is in the middle of (a workout, a weigh-in).
 */
import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useReturnPrompt } from '@/return/useReturnPrompt';

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const failed = (status: number, code = 'X') => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

let mockAnswer: () => Promise<unknown>;
const mockGet = jest.fn(async (_path: string) => mockAnswer());
const mockPush = jest.fn();
let mockPathname = '/';
const mockReport = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  usePathname: () => mockPathname,
}));
const mockServices = { api: { GET: mockGet }, report: mockReport };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const asked = { awayDays: 22, shouldPrompt: true, suggested: 'EASE_BACK' };
const notAsked = { awayDays: 3, shouldPrompt: false, suggested: 'PICK_UP' };

let foreground: ((state: AppStateStatus) => void) | null = null;
const remove = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/';
  mockAnswer = async () => ok(asked);
  foreground = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    foreground = listener;
    return { remove } as never;
  });
});

function Probe() {
  useReturnPrompt();
  return null;
}
async function open() {
  await render(<Probe />);
  await act(async () => {});
}

test('the server says to ask: the return screen opens', async () => {
  await open();
  expect(mockGet).toHaveBeenCalledWith('/v1/return');
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/return');
});

test('the server says not to (no gap, or already answered): no screen', async () => {
  mockAnswer = async () => ok(notAsked);
  await open();
  expect(mockPush).not.toHaveBeenCalled();
});

test.each([
  ['no connection', async () => Promise.reject(new TypeError('network'))],
  ['no profile or a server error', async () => failed(409)],
  ['not found', async () => failed(404)],
])('%s: no screen (the next opening asks again)', async (_, answer) => {
  mockAnswer = answer;
  await open();
  expect(mockPush).not.toHaveBeenCalled();
});

test('coming back to the app asks again; answered since, it is not shown again', async () => {
  await open();
  expect(mockPush).toHaveBeenCalledTimes(1);
  mockAnswer = async () => ok(notAsked);
  await act(async () => foreground?.('active'));
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test('going to the background asks nothing', async () => {
  await open();
  await act(async () => foreground?.('background'));
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test.each(['/workout', '/weigh-in', '/meal', '/return', '/onboarding'])('on %s, the person is busy: no screen over it', async (path) => {
  mockPathname = path;
  await open();
  expect(mockPush).not.toHaveBeenCalled();
});

test.each(['/', '/train', '/progress'])('on the %s tab it opens', async (path) => {
  mockPathname = path;
  await open();
  expect(mockPush).toHaveBeenCalledWith('/return');
});

test('stops listening when the tabs go', async () => {
  const view = await render(<Probe />);
  await act(async () => {});
  await act(async () => view.unmount());
  expect(remove).toHaveBeenCalledTimes(1);
});
