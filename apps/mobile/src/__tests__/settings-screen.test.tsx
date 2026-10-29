/**
 * Settings (K-309, prototype 5.2; K-1043: grouped lists, ADR-070 Ek 2): units, the consents (view, allow, withdraw — on the
 * pages Health data consent and Apple Health open), the data export, deleting the account and signing out. A destructive
 * step asks first: a withdrawal on screen in the warn colour (ADR-016), deleting and signing out in a system alert (ADR-087).
 * Sign out and Delete account are destructive rows (the warn colour is their design, ADR-070 Ek 2 #1); nothing else is warn
 * until a step asks.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import SettingsDetailScreen from '@/app/settings-detail';
import SettingsScreen from '@/app/settings';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Status = 'GRANTED' | 'WITHDRAWN' | 'NEVER_ASKED';
let mockConsents: Record<string, Status> = {};
let mockVersions: Record<string, string> = {}; // the text a grant was given to, where a test says

let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const mockHealthWriteOff = { workouts: false, weighIns: false };
const mockRemindersOff = { enabled: false, cue: '' }; // one object: useSyncExternalStore compares by identity
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const mockServices = {
  api: {
    GET: jest.fn(async (_path: string) =>
      ok(Object.entries(mockConsents).map(([kind, status]) => ({ kind, status, ...(mockVersions[kind] === undefined ? {} : { textVersion: mockVersions[kind] }) }))),
    ),
    PUT: jest.fn(async (_path: string, init: { params: { path: { kind: string } } }) => {
      mockConsents[init.params.path.kind] = 'GRANTED';
      delete mockVersions[init.params.path.kind];
      return ok({ status: 'GRANTED' });
    }),
    DELETE: jest.fn(async (_path: string, init: { params: { path: { kind: string } } }) => {
      mockConsents[init.params.path.kind] = 'WITHDRAWN';
      return ok({ status: 'WITHDRAWN' });
    }),
  },
  units: { set: jest.fn(async (_system: string) => 'profile' as const) },
  health: { available: true, requestRead: jest.fn(async () => {}) },
  // Bring in your history (K-616): its own behaviour is import-section.test.tsx.
  importHealthWeights: jest.fn(async () => 0),
  pendingCount: jest.fn(async () => 0),
  // Progress photos on this phone (K-614): none unless a test puts some.
  photos: { photos: jest.fn(async (): Promise<{ takenOn: string; pose: string; uri: string }[]> => []) },
  signOut: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  consents: {
    remember: jest.fn(async (_kind: string, _status: string) => {}),
    granted: jest.fn(async (_kind: string) => mockConsents.HEALTH_DATA === 'GRANTED'),
  },
  withdrawHealthData: jest.fn(async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
  }),
  report: jest.fn(),
  // The reminders section (K-410) sits on this screen; its own behaviour is reminders-section.test.tsx.
  reminders: {
    current: () => mockRemindersOff,
    subscribe: () => () => {},
    permission: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  },  // The Apple Health write switches (K-412): off. One settings object (useSyncExternalStore).
  healthWriting: { current: () => mockHealthWriteOff, subscribe: () => () => {}, shown: () => 'off' },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => mockUnits,
  useAppearance: () => 'light',
}));
// The subscription section (K-702) reads the server on its own; its behaviour is subscription-section.test.tsx. Here it
// would take this file's consent answers (one GET mock for every path) out of their order.
jest.mock('@/settings/SubscriptionSection', () => ({ SubscriptionSection: () => null }));
// The training group and the food row (K-982) read the program, the gyms and the profile on their own; their behaviour is
// settings-groups.test.tsx. Here they would take this file's consent answers out of their order too. The Gyms row stays, to open the gyms.
jest.mock('@/settings/TrainingGroup', () => ({
  TrainingGroup: () => {
    const { ListRow } = jest.requireActual('@/components/ListGroup');
    const { router } = jest.requireMock('expo-router');
    return <ListRow label="Gyms" onPress={() => router.push('/gyms')} />;
  },
}));
jest.mock('@/settings/FoodGroup', () => ({ FoodGroup: () => null }));

beforeEach(() => {
  mockConsents = { HEALTH_DATA: 'GRANTED', APPLE_HEALTH: 'NEVER_ASKED', THIRD_PARTY_AI: 'NEVER_ASKED' };
  mockVersions = {};
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
/** A page under Settings (K-1043): what the row Health data consent, Apple Health, ... opens. */
async function showDetail(part: string) {
  mockParams = { part };
  await render(
    <ThemeProvider scheme="light">
      <SettingsDetailScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

const button = (name: string) => screen.getByRole('button', { name });
async function press(name: string) {
  await fireEvent.press(button(name));
  await act(async () => {});
}
/**
 * Buttons drawn in the warn colour: the rule is none but a confirming step's. A warn button is the destructive role now
 * (ADR-070 Ek 2 #1): words in the warning colour with no fill, so it is found by its label's colour, not by a fill.
 */
const DESTRUCTIVE_ROWS = [t('settings.signOut.title'), t('settings.delete.title')];
const warnButtons = () =>
  screen.queryAllByRole('button').filter((b) => !DESTRUCTIVE_ROWS.includes(b.props.accessibilityLabel)).filter((b) => {
    const warned = (node: { props: { style?: unknown }; children?: unknown[] }): boolean => {
      const flat = [node.props.style].flat(Infinity) as ({ color?: string } | undefined)[];
      if (flat.some((style) => style?.color === palettes.light.warn)) return true;
      return (node.children ?? []).some((child) => typeof child === 'object' && child !== null && warned(child as never));
    };
    return warned(b as never);
  });
// The destructive questions are system alerts (ADR-087 #1): the spy stands in for the system, and a tap on one of its buttons is its onPress.
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const lastAlert = () => {
  const [title, message, buttons] = alert.mock.calls[alert.mock.calls.length - 1] as [string, string, AlertButton[]];
  return { title, message, buttons };
};
const tapAlert = async (style: 'cancel' | 'destructive') =>
  act(async () => lastAlert().buttons.find((b) => b.style === style)!.onPress?.());
const row = (kind: 'HEALTH_DATA' | 'APPLE_HEALTH') => t(`settings.consents.${kind}`);

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual<object>('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

test("Gyms opens the user's gyms (K-421)", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Gyms'));
  expect(mockPush).toHaveBeenCalledWith('/gyms');
});

test('the sections are there, and nothing is in the warn colour until a destructive step asks', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('settings.title') })).toBeOnTheScreen();
  for (const key of ['units.title', 'health.title', 'import.title', 'account.title', 'export.title', 'delete.title', 'signOut.title']) {
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
  test('Health and data lists each health consent with its state and opens its page; the AI consent has no row (K-511, V2)', async () => {
    await show();
    expect(button(`${t('settings.health.consent')}, ${t('settings.consents.allowed')}`)).toBeOnTheScreen();
    expect(button(`${row('APPLE_HEALTH')}, ${t('settings.consents.notAllowed')}`)).toBeOnTheScreen();
    await press(`${t('settings.health.consent')}, ${t('settings.consents.allowed')}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'consent' } });
    await press(`${row('APPLE_HEALTH')}, ${t('settings.consents.notAllowed')}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'apple' } });
    // Not before the AI provider is named (V2): no row, and no button, for it.
    expect(screen.queryAllByRole('button').filter((b) => /THIRD_PARTY_AI|missing/.test(String(b.props.accessibilityLabel)))).toEqual([]);
  });

  test('a consent that is outdated says Allow again on its row; the long reason is on its page', async () => {
    mockVersions.HEALTH_DATA = '4';
    await show();
    expect(button(`${t('settings.health.consent')}, ${t('settings.consents.outdatedShort')}`)).toBeOnTheScreen();
    await showDetail('consent');
    expect(screen.getByText(t('settings.consents.outdated'))).toBeOnTheScreen();
  });

  test('each consent has a page of its own, titled by its row, with that consent alone: its text, Allow and Withdraw (ADR-007)', async () => {
    await showDetail('consent');
    expect(screen.getByRole('header', { name: t('settings.health.consent') })).toBeOnTheScreen();
    expect(screen.getByText(row('HEALTH_DATA'))).toBeOnTheScreen();
    expect(screen.queryByText(row('APPLE_HEALTH'))).toBeNull();
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: new RegExp(`^${t('settings.consents.view')} `) })).toHaveLength(1);
  });
  test('View shows the text the consent was given to', async () => {
    await showDetail('consent');
    await press(`${t('settings.consents.view')} ${row('HEALTH_DATA')}`);
    expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
  });

  test('Withdraw asks first — the only warn-coloured button is its confirmation — then withdraws and shows the new state', async () => {
    await showDetail('consent');
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
    await showDetail('consent');
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    await press(t('settings.withdrawConfirm.keep'));
    expect(mockServices.api.DELETE).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeNull();
  });

  test('Allow on the health data consent records the version shown', async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
    await showDetail('consent');
    await press(`${t('settings.consents.allow')} ${row('HEALTH_DATA')}`);
    expect(mockServices.api.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
      params: { path: { kind: 'HEALTH_DATA' } },
      body: { textVersion: t('consent.health_data.version') },
    });
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
    expect(mockServices.consents.remember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
  });

  test('the health data consent given to version 4 reads outdated: the text was revised into points (K-1032)', async () => {
    mockVersions.HEALTH_DATA = '4';
    await showDetail('consent');
    expect(screen.getByText(t('settings.consents.outdated'))).toBeOnTheScreen();
    expect(screen.queryAllByText(t('settings.consents.allowed'))).toHaveLength(0);
  });

  test('a consent given to a text since revised (K-429): not allowed, and both ways are open — the new text, or withdrawing', async () => {
    mockVersions.HEALTH_DATA = '1-draft';
    await showDetail('consent');
    expect(screen.getByText(t('settings.consents.outdated'))).toBeOnTheScreen();
    expect(screen.queryAllByText(t('settings.consents.allowed'))).toHaveLength(0);
    // Withdrawing needs no yes to the new text first (GDPR Art. 7(3)): it asks, then deletes as any withdrawal does.
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);
    expect(screen.getByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeOnTheScreen();
    await press(t('settings.withdrawConfirm.keep'));
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
    await showDetail('apple');
    await press(`${t('settings.consents.allow')} ${row('APPLE_HEALTH')}`);
    expect(order).toEqual(['sheet', 'consent APPLE_HEALTH']);
  });

  test('Apple Health cannot be allowed without the health data consent, nor where HealthKit is not in the build', async () => {
    mockConsents.HEALTH_DATA = 'WITHDRAWN';
    await showDetail('apple');
    expect(screen.queryByRole('button', { name: `${t('settings.consents.allow')} ${row('APPLE_HEALTH')}` })).toBeNull();
    expect(screen.getByText(t('settings.consents.needsHealthConsent'))).toBeOnTheScreen();
  });

  test('where HealthKit is not in the build, Apple Health says so', async () => {
    mockServices.health.available = false;
    await showDetail('apple');
    expect(screen.queryByRole('button', { name: `${t('settings.consents.allow')} ${row('APPLE_HEALTH')}` })).toBeNull();
    expect(screen.getByText(t('settings.consents.unavailable'))).toBeOnTheScreen();
  });

  test('consents that cannot be loaded say so, and can be tried again', async () => {
    mockServices.api.GET.mockRejectedValueOnce(new TypeError('Network request failed'));
    await showDetail('consent');
    expect(screen.getByText(t('settings.consents.loadFailed'))).toBeOnTheScreen();
    await press(t('settings.consents.retry'));
    expect(screen.getByText(row('HEALTH_DATA'))).toBeOnTheScreen();
  });

  test('a change that went through shows at once, even when reading the states back fails — and the failure shows', async () => {
    await showDetail('consent');
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
    await showDetail('apple');
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
    await showDetail('apple');
    await press(`${t('settings.consents.allow')} ${row('APPLE_HEALTH')}`);
    expect(screen.getByText(t('settings.consents.sheetFailed'))).toBeOnTheScreen();
    expect(mockServices.api.PUT).not.toHaveBeenCalled();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'HealthSheetFailed' });
  });

  test('the health data withdrawal says the entries are deleted for good, and offers the export first (K-231)', async () => {
    expect(t('settings.withdrawConfirm.HEALTH_DATA.body')).toMatch(/delet/i);
    expect(t('settings.withdrawConfirm.HEALTH_DATA.body')).toMatch(/undo/i);
    await showDetail('consent');
    await press(`${t('settings.consents.withdraw')} ${row('HEALTH_DATA')}`);

    await press(t('settings.withdrawConfirm.exportFirst'));

    expect(mockServices.exportData).toHaveBeenCalledTimes(1);
    expect(mockServices.withdrawHealthData).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.withdrawConfirm.HEALTH_DATA.body'))).toBeOnTheScreen(); // still asking
    expect(warnButtons()).toEqual([button(t('settings.withdrawConfirm.confirm'))]);
  });

  test('Apple Health deletes nothing stored, so its question offers no export', async () => {
    mockConsents.APPLE_HEALTH = 'GRANTED';
    await showDetail('apple');
    await press(`${t('settings.consents.withdraw')} ${row('APPLE_HEALTH')}`);
    expect(screen.queryByRole('button', { name: t('settings.withdrawConfirm.exportFirst') })).toBeNull();
  });

  test('a change the server refuses says so and keeps the state shown', async () => {
    mockServices.withdrawHealthData.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConsentRefused' }));
    await showDetail('consent');
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

  test('Delete account asks first, in a system alert; "Keep my account" changes nothing', async () => {
    await show();
    await press(t('settings.delete.title'));
    expect(lastAlert().title).toBe(t('settings.delete.confirmTitle'));
    expect(screen.queryByText(t('settings.delete.confirmTitle'))).toBeNull();
    expect(warnButtons()).toEqual([]);
    await tapAlert('cancel');
    expect(mockServices.deleteAccount).not.toHaveBeenCalled();
    await press(t('settings.delete.title'));
    await tapAlert('destructive');
    expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
  });

  test('a deletion that does not go through says so', async () => {
    mockServices.deleteAccount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'DeletionFailed' }));
    await show();
    await press(t('settings.delete.title'));
    await tapAlert('destructive');
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
    expect(lastAlert().message).toBe(t('settings.signOut.pending', { count: 3 }));
    expect(warnButtons()).toEqual([]);
    await tapAlert('destructive');
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
  });

  test('progress photos on this phone: signing out says they go with it, first (K-614)', async () => {
    mockServices.photos.photos.mockResolvedValueOnce([{ takenOn: '2026-10-07', pose: 'front', uri: 'file:///docs/a.jpg' }]);
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(lastAlert().message).toBe(t('settings.signOut.photos'));
    await tapAlert('destructive');
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
  });

  test('entries waiting and photos: both said', async () => {
    mockServices.pendingCount.mockResolvedValueOnce(2);
    mockServices.photos.photos.mockResolvedValueOnce([{ takenOn: '2026-10-07', pose: 'front', uri: 'file:///docs/a.jpg' }]);
    await show();
    await press(t('settings.signOut.title'));
    expect(lastAlert().message).toContain(t('settings.signOut.pending', { count: 2 }));
    expect(lastAlert().message).toContain(t('settings.signOut.photos'));
  });

  test('"Stay signed in" keeps the session and the entries', async () => {
    mockServices.pendingCount.mockResolvedValue(3);
    await show();
    await press(t('settings.signOut.title'));
    await tapAlert('cancel');
    expect(mockServices.signOut).not.toHaveBeenCalled();
  });

  test('when the phone cannot count what is waiting, it does not sign out blind: it says so', async () => {
    mockServices.pendingCount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'SqliteError' }));
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.serverError'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'SqliteError' });
  });

  test('entries waiting, no photos: no word about photos (K-614)', async () => {
    mockServices.pendingCount.mockResolvedValueOnce(3);
    await show();
    await press(t('settings.signOut.title'));
    expect(lastAlert().message).not.toContain(t('settings.signOut.photos'));
  });

  test('when the phone cannot read its photos, it does not sign out blind either (K-614)', async () => {
    mockServices.photos.photos.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
    await show();
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.serverError'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
  });

  test('deleting offline says it is the connection', async () => {
    mockServices.deleteAccount.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await show();
    await press(t('settings.delete.title'));
    await tapAlert('destructive');
    expect(screen.getByText(t('settings.delete.failed'))).toBeOnTheScreen();
    expect(screen.queryByText(t('settings.serverError'))).toBeNull();
  });

  test('two taps on "Delete everything" in the same moment delete once', async () => {
    let finish = () => {};
    mockServices.deleteAccount.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    await show();
    await press(t('settings.delete.title'));
    const confirm = lastAlert().buttons.find((b) => b.style === 'destructive')!;
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        confirm.onPress?.();
        confirm.onPress?.();
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});
