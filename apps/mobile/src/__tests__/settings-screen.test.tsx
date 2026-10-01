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
  consents: { remember: jest.fn(async (_kind: string, _status: string) => {}) },
  withdrawHealthData: jest.fn(async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
  }),
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
    // Exactly the two health consents: no row, and no button, for the AI consent (V2: not before its provider is named).
    expect(screen.getAllByRole('button', { name: new RegExp(`^${t('settings.consents.view')} `) })).toHaveLength(2);
    expect(screen.queryAllByRole('button').filter((b) => /THIRD_PARTY_AI|missing/.test(String(b.props.accessibilityLabel)))).toEqual([]);
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
    expect(warnButtons()).toEqual([button(t('settings.withdrawConfirm.confirm'))]); // the confirm, not "Keep it"
    await press(t('settings.withdrawConfirm.confirm'));
    // K-231: through the one path that confirms the deletion on the server and forgets the entries on the phone.
    expect(mockServices.withdrawHealthData).toHaveBeenCalledTimes(1);
    expect(mockServices.api.DELETE).not.toHaveBeenCalled();
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
    expect(mockServices.consents.remember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
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

  test('a change that went through shows at once, even when reading the states back fails — and the failure shows', async () => {
    await show();
    mockServices.api.GET.mockRejectedValueOnce(new TypeError('Network request failed'));
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    await press(t('settings.withdrawConfirm.confirm'));
    expect(screen.queryAllByText(t('settings.consents.allowed'))).toHaveLength(0); // withdrawn, as the server said
    expect(screen.getByText(t('settings.consents.loadFailed'))).toBeOnTheScreen();
    await press(t('settings.consents.retry'));
    expect(screen.queryByText(t('settings.consents.loadFailed'))).toBeNull();
  });

  test('Apple Health can be withdrawn too, with its own question', async () => {
    mockConsents.APPLE_HEALTH = 'GRANTED';
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('APPLE_HEALTH')}`);
    expect(screen.getByText(t('settings.withdrawConfirm.APPLE_HEALTH.body'))).toBeOnTheScreen();
    await press(t('settings.withdrawConfirm.confirm'));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/consents/{kind}', { params: { path: { kind: 'APPLE_HEALTH' } } });
    expect(mockServices.withdrawHealthData).not.toHaveBeenCalled();
    // The phone knows at once: offline, Apple Health is not read on an old yes (K-402 review).
    expect(mockServices.consents.remember).toHaveBeenCalledWith('APPLE_HEALTH', 'WITHDRAWN');
  });

  test("Apple's sheet failing in Settings says so and records nothing", async () => {
    mockServices.health.requestRead.mockRejectedValueOnce(new Error('HealthKit'));
    await show();
    await press(`${t('settings.consents.allow')} ${row('APPLE_HEALTH')}`);
    expect(screen.getByText(t('settings.consents.sheetFailed'))).toBeOnTheScreen();
    expect(mockServices.api.PUT).not.toHaveBeenCalled();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'HealthSheetFailed' });
  });

  test('the health data withdrawal says the entries are deleted for good, and offers the export first (K-231)', async () => {
    expect(t('settings.withdrawConfirm.HEALTH_DATA.body')).toMatch(/delet/i);
    expect(t('settings.withdrawConfirm.HEALTH_DATA.body')).toMatch(/undo/i);
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);

    await press(t('settings.withdrawConfirm.exportFirst'));

    expect(mockServices.exportData).toHaveBeenCalledTimes(1);
    expect(mockServices.withdrawHealthData).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeOnTheScreen(); // still asking
    expect(warnButtons()).toEqual([button(t('settings.withdrawConfirm.confirm'))]);
  });

  test('Apple Health deletes nothing stored, so its question offers no export', async () => {
    mockConsents.APPLE_HEALTH = 'GRANTED';
    await show();
    await press(`${t('settings.consents.withdraw')} ${row('APPLE_HEALTH')}`);
    expect(screen.queryByRole('button', { name: t('settings.withdrawConfirm.exportFirst') })).toBeNull();
  });

  test('a change the server refuses says so and keeps the state shown', async () => {
    mockServices.withdrawHealthData.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConsentRefused' }));
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
    expect(warnButtons()).toEqual([button(t('settings.delete.confirm'))]);
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
    expect(warnButtons()).toEqual([button(t('settings.signOut.confirm'))]);
    await press(t('settings.signOut.confirm'));
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
  });

  test('"Stay signed in" keeps the session and the entries', async () => {
    mockServices.pendingCount.mockResolvedValue(3);
    await show();
    await press(t('settings.signOut.title'));
    await press(t('settings.signOut.keep'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.signOut.pending', { count: 3 }))).toBeNull();
  });

  test('when the phone cannot count what is waiting, it does not sign out blind: it says so', async () => {
    mockServices.pendingCount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'SqliteError' }));
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.serverError'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'SqliteError' });
  });

  test('deleting offline says it is the connection', async () => {
    mockServices.deleteAccount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await show();
    await press(t('settings.delete.title'));
    await press(t('settings.delete.confirm'));
    expect(screen.getByText(t('settings.delete.failed'))).toBeOnTheScreen();
    expect(screen.queryByText(t('settings.serverError'))).toBeNull();
  });

  test('two taps on "Delete everything" in the same moment delete once', async () => {
    let finish = () => {};
    mockServices.deleteAccount.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    await show();
    await press(t('settings.delete.title'));
    const confirm = button(t('settings.delete.confirm'));
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(confirm);
        void fireEvent.press(confirm);
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});
