/**
 * Settings (K-309, prototype 5.2): units, the consents (view, allow, withdraw), the data export, deleting the account
 * and signing out. A destructive step asks first, and the warn colour appears only on that confirming step (ADR-016).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Status = 'GRANTED' | 'WITHDRAWN' | 'NEVER_ASKED';
let mockConsents: Record<string, Status> = {};
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const mockServices = {
  api: {
    GET: jest.fn(async (_path: string) => ok(Object.entries(mockConsents).map(([kind, status]) => ({ kind, status })))),
    PUT: jest.fn(async (_path: string, init: { params: { path: { kind: string } } }) => {
      mockConsents[init.params.path.kind] = 'GRANTED';
      return ok({ status: 'GRANTED' });
    }),
    DELETE: jest.fn(async (_path: string, init: { params: { path: { kind: string } } }) => {
      mockConsents[init.params.path.kind] = 'WITHDRAWN';
      return ok({ status: 'WITHDRAWN' });
    }),
  },
  units: { set: jest.fn(async (_system: string) => 'profile' as const) },
  health: { available: true, requestRead: jest.fn(async () => {}) },
  pendingCount: jest.fn(async () => 0),
  signOut: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => mockUnits,
}));

beforeEach(() => {
  mockConsents = { HEALTH_DATA: 'GRANTED', APPLE_HEALTH: 'NEVER_ASKED', THIRD_PARTY_AI: 'NEVER_ASKED' };
  mockUnits = 'METRIC';
  jest.clearAllMocks();
  mockServices.health.available = true;
  mockServices.pendingCount.mockResolvedValue(0);
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <SettingsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

const button = (name: string) => screen.getByRole('button', { name });
async function press(name: string) {
  await fireEvent.press(button(name));
  await act(async () => {});
}
/** Buttons drawn in the warn colour: the rule is none but a confirming step's. */
const warnButtons = () =>
  screen.queryAllByRole('button').filter((b) => {
    const flat = [b.props.style].flat(Infinity) as ({ backgroundColor?: string } | undefined)[];
    return flat.some((style) => style?.backgroundColor === palettes.light.warn);
  });
const row = (kind: 'HEALTH_DATA' | 'APPLE_HEALTH') => t(`settings.consents.${kind}`);

test('the sections are there, and nothing is in the warn colour until a destructive step asks', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('settings.title') })).toBeOnTheScreen();
  for (const key of ['units.title', 'consents.title', 'account.title', 'export.title', 'delete.title', 'signOut.title']) {
    expect(screen.getAllByText(t(`settings.${key}`)).length).toBeGreaterThan(0);
  }
  expect(warnButtons()).toEqual([]);
});

describe('units', () => {
  test('the current system is selected; choosing the other stores it on the profile', async () => {
    await show();
    expect(button(t('settings.units.metric'))).toBeSelected();
    await press(t('settings.units.imperial'));
    expect(mockServices.units.set).toHaveBeenCalledWith('IMPERIAL');
  });

  test('a change that does not go through says so', async () => {
    mockServices.units.set.mockRejectedValueOnce(new Error('offline'));
    await show();
    await press(t('settings.units.imperial'));
    expect(screen.getByText(t('settings.units.failed'))).toBeOnTheScreen();
  });
});

describe('consents', () => {
  test('each health consent with its state; the AI consent is not offered before a provider is chosen (K-511)', async () => {
    await show();
    expect(screen.getByText(row('HEALTH_DATA'))).toBeOnTheScreen();
    expect(screen.getByText(row('APPLE_HEALTH'))).toBeOnTheScreen();
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
    expect(screen.queryByText(t('consent.third_party_ai.title'))).toBeNull();
  });

  test('View shows the text the consent was given to', async () => {
    await show();
    await press(`${t('settings.consents.view')} ${row('HEALTH_DATA')}`);
    expect(screen.getByText(t('consent.health_data.body'))).toBeOnTheScreen();
  });

  test('Withdraw asks first — the only warn-coloured button is its confirmation — then withdraws and shows the new state', async () => {
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    expect(mockServices.api.DELETE).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeOnTheScreen();
    expect(warnButtons().map((b) => b.props.accessibilityLabel ?? '')).toHaveLength(1);
    await press(t('settings.withdrawConfirm.confirm'));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/consents/{kind}', { params: { path: { kind: 'HEALTH_DATA' } } });
    expect(screen.queryAllByText(t('settings.consents.allowed'))).toHaveLength(0);
    expect(warnButtons()).toEqual([]);
  });

  test('"Keep it" closes the question and changes nothing', async () => {
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    await press(t('settings.withdrawConfirm.keep'));
    expect(mockServices.api.DELETE).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeNull();
  });

  test('Allow on the health data consent records the version shown', async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
    await show();
    await press(`${t('settings.consents.allow')} ${row('HEALTH_DATA')}`);
    expect(mockServices.api.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
      params: { path: { kind: 'HEALTH_DATA' } },
      body: { textVersion: t('consent.health_data.version') },
    });
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
  });

  test("Allow on Apple Health shows Apple's sheet first, then records the consent", async () => {
    const order: string[] = [];
    mockServices.health.requestRead.mockImplementationOnce(async () => void order.push('sheet'));
    mockServices.api.PUT.mockImplementationOnce(async (_p, init) => {
      order.push(`consent ${init.params.path.kind}`);
      return ok({ status: 'GRANTED' });
    });
    await show();
    await press(`${t('settings.consents.allow')} ${row('APPLE_HEALTH')}`);
    expect(order).toEqual(['sheet', 'consent APPLE_HEALTH']);
  });

  test('Apple Health cannot be allowed without the health data consent, nor where HealthKit is not in the build', async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
    await show();
    expect(screen.queryByRole('button', { name: `${t('settings.consents.allow')} ${row('APPLE_HEALTH')}` })).toBeNull();
    expect(screen.getByText(t('settings.consents.needsHealthConsent'))).toBeOnTheScreen();
  });

  test('where HealthKit is not in the build, Apple Health says so', async () => {
    mockServices.health.available = false;
    await show();
    expect(screen.queryByRole('button', { name: `${t('settings.consents.allow')} ${row('APPLE_HEALTH')}` })).toBeNull();
    expect(screen.getByText(t('settings.consents.unavailable'))).toBeOnTheScreen();
  });

  test('consents that cannot be loaded say so, and can be tried again', async () => {
    mockServices.api.GET.mockRejectedValueOnce(new TypeError('Network request failed'));
    await show();
    expect(screen.getByText(t('settings.consents.loadFailed'))).toBeOnTheScreen();
    await press(t('settings.consents.retry'));
    expect(screen.getByText(row('HEALTH_DATA'))).toBeOnTheScreen();
  });

  test('a change the server refuses says so and keeps the state shown', async () => {
    mockServices.api.DELETE.mockResolvedValueOnce({ error: { code: 'X' }, response: new Response(null, { status: 500 }) } as never);
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    await press(t('settings.withdrawConfirm.confirm'));
    expect(screen.getByText(t('settings.serverError'))).toBeOnTheScreen();
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'ConsentRefused' });
  });
});

describe('export, delete, sign out', () => {
  test('Export my data hands over the file', async () => {
    await show();
    await press(t('settings.export.title'));
    expect(mockServices.exportData).toHaveBeenCalledTimes(1);
  });

  test('an export that does not go through says so', async () => {
    mockServices.exportData.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await show();
    await press(t('settings.export.title'));
    expect(screen.getByText(t('settings.export.failed'))).toBeOnTheScreen();
  });

  test('Delete account asks first, in the warn colour only there; "Keep my account" changes nothing', async () => {
    await show();
    await press(t('settings.delete.title'));
    expect(screen.getByText(t('settings.delete.confirmTitle'))).toBeOnTheScreen();
    expect(warnButtons()).toHaveLength(1);
    await press(t('settings.delete.keep'));
    expect(mockServices.deleteAccount).not.toHaveBeenCalled();
    await press(t('settings.delete.title'));
    await press(t('settings.delete.confirm'));
    expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
  });

  test('a deletion that does not go through says so', async () => {
    mockServices.deleteAccount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'DeletionFailed' }));
    await show();
    await press(t('settings.delete.title'));
    await press(t('settings.delete.confirm'));
    expect(screen.getByText(t('settings.serverError'))).toBeOnTheScreen();
  });

  test('signing out with nothing waiting signs out at once', async () => {
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
  });

  test('entries not yet on the server: signing out warns first, with how many', async () => {
    mockServices.pendingCount.mockResolvedValue(3);
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.signOut.pending', { count: 3 }))).toBeOnTheScreen();
    await press(t('settings.signOut.confirm'));
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
  });
});
