/**
 * The reminders on the phone (K-410): off until the user turns them on and iOS allows them; then every change — the
 * schedule from the profile, the user's sentence, an app opened — replaces what is scheduled, one change at a time.
 */
import type { Reminder, Schedule } from '@/notifications/plan';
import { notificationParams as P } from '@/notifications/params';
import { type NotificationAccess, type NotificationPermission, createReminders, trackOpens } from '@/notifications/reminders';

const schedule: Schedule = { trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' };
const now = new Date(2026, 9, 2, 12, 0);

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}

/** A phone: what is scheduled now, how often it was replaced, and the permission iOS would answer. */
type Device = {
  permission: NotificationPermission;
  answer: NotificationPermission;
  scheduled: Reminder[];
  replaced: number;
  asked: number;
  access: NotificationAccess;
};
function fakeDevice(permission: NotificationPermission = { granted: true, canAskAgain: true }): Device {
  const device: Device = {
    permission,
    answer: permission,
    scheduled: [] as Reminder[],
    replaced: 0,
    asked: 0,
    access: {
      permission: async () => device.permission,
      request: async () => {
        device.asked += 1;
        device.permission = device.answer;
        return device.permission;
      },
      replace: async (reminders: Reminder[]) => {
        device.replaced += 1;
        device.scheduled = reminders;
      },
      clear: async () => {
        device.scheduled = [];
      },
    },
  };
  return device;
}

const kinds = (reminders: Reminder[]) => reminders.map((r) => r.kind);

async function make(kv = memoryKv(), device = fakeDevice(), report = jest.fn()) {
  const reminders = await createReminders({ kv, access: device.access, now: () => now, report });
  return { reminders, kv, device, report };
}

test('off until the user turns them on: a schedule and an open plan nothing', async () => {
  const { reminders, device } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.opened();
  expect(reminders.current().enabled).toBe(false);
  expect(device.scheduled).toEqual([]);
  expect(device.asked).toBe(0);
});

test('turning on asks iOS once; allowed, the three slots are scheduled from what is kept', async () => {
  const { reminders, device } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.opened();
  expect(await reminders.turnOn()).toEqual({ granted: true, canAskAgain: true });
  expect(device.asked).toBe(1);
  expect(reminders.current().enabled).toBe(true);
  expect(kinds(device.scheduled)).toEqual(['training', 'check_in', 'quiet']);
});

test('refused by iOS, they stay off and nothing is scheduled', async () => {
  const device = fakeDevice({ granted: false, canAskAgain: true });
  device.answer = { granted: false, canAskAgain: false };
  const { reminders } = await make(memoryKv(), device);
  await reminders.keepSchedule(schedule);
  expect(await reminders.turnOn()).toEqual({ granted: false, canAskAgain: false });
  expect(reminders.current().enabled).toBe(false);
  expect(device.scheduled).toEqual([]);
});

test('turned off in iOS Settings later: the next change clears them; allowed again, they come back', async () => {
  const { reminders, device } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  device.permission = { granted: false, canAskAgain: false };
  await reminders.opened();
  expect(device.scheduled).toEqual([]);
  device.permission = { granted: true, canAskAgain: true };
  await reminders.opened();
  expect(kinds(device.scheduled)).toContain('training');
});

test('the user\'s sentence: trimmed, cut to the limit, kept, and the training reminder\'s body', async () => {
  const { reminders, device, kv } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  await reminders.setCue(`  ${'a'.repeat(P.cueMaxChars + 10)}  `);
  expect(reminders.current().cue).toBe('a'.repeat(P.cueMaxChars));
  await reminders.setCue('  After work, straight to the gym ');
  expect(device.scheduled.find((r) => r.kind === 'training')?.body).toBe('After work, straight to the gym');
  const again = await make(kv);
  expect(again.reminders.current().cue).toBe('After work, straight to the gym');
  await reminders.setCue('   ');
  expect(reminders.current().cue).toBe('');
  expect(kv.items.has('reminders.cue')).toBe(false);
});

test('opening the app moves the quiet message a week past this open', async () => {
  let clock = now;
  const kv = memoryKv();
  const device = fakeDevice();
  const reminders = await createReminders({ kv, access: device.access, now: () => clock, report: jest.fn() });
  await reminders.turnOn();
  await reminders.opened();
  clock = new Date(2026, 9, 4, 8, 30);
  await reminders.opened();
  const quiet = device.scheduled.find((r) => r.kind === 'quiet');
  expect(quiet?.when).toEqual({ at: new Date(2026, 9, 4 + P.quietDays, 8, 30) });
});

test('on and off are kept: a new start keeps the choice and the schedule', async () => {
  const { reminders, kv } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  const restarted = await make(kv);
  expect(restarted.reminders.current().enabled).toBe(true);
  await restarted.reminders.opened();
  expect(kinds(restarted.device.scheduled)).toEqual(['training', 'check_in', 'quiet']);
  await restarted.reminders.turnOff();
  expect(restarted.device.scheduled).toEqual([]);
  expect((await make(kv)).reminders.current().enabled).toBe(false);
});

describe('only the check-in morning (the plan\'s "Tell me Monday morning", K-967)', () => {
  test('turned on that way: only that slot is scheduled, and it is kept across a start', async () => {
    const { reminders, device, kv } = await make();
    await reminders.keepSchedule(schedule);
    await reminders.opened();
    await reminders.turnOn({ only: 'check_in' });
    expect(reminders.current()).toEqual({ enabled: true, cue: '', only: 'check_in' });
    expect(kinds(device.scheduled)).toEqual(['check_in']);
    const restarted = await make(kv);
    expect(restarted.reminders.current().only).toBe('check_in');
    await restarted.reminders.opened();
    expect(kinds(restarted.device.scheduled)).toEqual(['check_in']);
  });

  test('turned on in full afterwards (Settings): all three again', async () => {
    const { reminders, device } = await make();
    await reminders.keepSchedule(schedule);
    await reminders.opened();
    await reminders.turnOn({ only: 'check_in' });
    await reminders.turnOn();
    expect(reminders.current()).toEqual({ enabled: true, cue: '' });
    expect(kinds(device.scheduled)).toEqual(['training', 'check_in', 'quiet']);
  });

  test('turned off, and at sign-out, nothing of it is kept', async () => {
    const { reminders, kv } = await make();
    await reminders.turnOn({ only: 'check_in' });
    await reminders.turnOff();
    expect(kv.items.has('reminders.only')).toBe(false);
    await reminders.turnOn({ only: 'check_in' });
    await reminders.forget();
    expect([...kv.items.keys()].filter((key) => key.startsWith('reminders.'))).toEqual([]);
  });

  test('refused by iOS: nothing is kept', async () => {
    const device = fakeDevice({ granted: false, canAskAgain: false });
    const { reminders, kv } = await make(memoryKv(), device);
    await reminders.turnOn({ only: 'check_in' });
    expect(reminders.current()).toEqual({ enabled: false, cue: '' });
    expect(kv.items.has('reminders.only')).toBe(false);
  });
});

test('a sign-out forgets it all: nothing scheduled, nothing kept for the next account', async () => {
  const { reminders, kv, device } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.setCue('Lunch break, gym next door');
  await reminders.turnOn();
  await reminders.forget();
  expect(device.scheduled).toEqual([]);
  expect([...kv.items.keys()].filter((key) => key.startsWith('reminders.'))).toEqual([]);
  expect(reminders.current()).toEqual({ enabled: false, cue: '' });
});

test('changes go one at a time: the last scheduled plan holds every change, however slow the phone', async () => {
  const device = fakeDevice();
  let active = 0;
  let most = 0;
  const replace = device.access.replace;
  device.access.replace = async (reminders) => {
    active += 1;
    most = Math.max(most, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await replace(reminders);
    active -= 1;
  };
  const { reminders } = await make(memoryKv(), device);
  await reminders.turnOn();
  await Promise.all([reminders.keepSchedule(schedule), reminders.setCue('Right after class'), reminders.opened()]);
  expect(most).toBe(1);
  expect(device.scheduled.find((r) => r.kind === 'training')?.body).toBe('Right after class');
});

test('a sign-out while a change is on its way still ends with nothing scheduled', async () => {
  const device = fakeDevice();
  const replace = device.access.replace;
  device.access.replace = async (reminders) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    await replace(reminders);
  };
  const { reminders } = await make(memoryKv(), device);
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  const late = reminders.opened();
  await reminders.forget();
  await late;
  expect(device.scheduled).toEqual([]);
});

test('a phone that fails to schedule is reported by name; the caller goes on', async () => {
  const device = fakeDevice();
  device.access.replace = async () => {
    throw Object.assign(new Error('UNUserNotificationCenter said no'), { name: 'ScheduleFailed' });
  };
  const { reminders, report } = await make(memoryKv(), device);
  await reminders.turnOn();
  await expect(reminders.opened()).resolves.toBeUndefined();
  expect(report).toHaveBeenCalledWith({ name: 'ScheduleFailed' });
});

test('a declared state mutes them (K-516 plugs it in)', async () => {
  const device = fakeDevice();
  const reminders = await createReminders({ kv: memoryKv(), access: device.access, now: () => now, report: jest.fn(), muted: async () => true });
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  expect(device.scheduled).toEqual([]);
});

test('a kept schedule that is not one (an older app wrote it) counts as none', async () => {
  const kv = memoryKv();
  kv.items.set('reminders.schedule', '{not json');
  kv.items.set('reminders.enabled', 'on');
  const { reminders, device } = await make(kv);
  await reminders.opened();
  expect(kinds(device.scheduled)).toEqual(['quiet']);
});

test("a sign-out while iOS's sheet is open: the answer that comes after does not turn them on for the next account", async () => {
  const device = fakeDevice({ granted: false, canAskAgain: true });
  let allow = () => {};
  device.access.request = () =>
    new Promise((resolve) => {
      allow = () => {
        device.permission = { granted: true, canAskAgain: false };
        resolve(device.permission);
      };
    });
  const { reminders, kv } = await make(memoryKv(), device);
  const asking = reminders.turnOn();
  await reminders.forget();
  allow();
  await asking;
  expect(reminders.current().enabled).toBe(false);
  expect(kv.items.has('reminders.enabled')).toBe(false);
  await reminders.keepSchedule(schedule); // the next account's profile
  expect(device.scheduled).toEqual([]);
});

test("a sign-out while the sentence is being kept: the old account's words do not come back", async () => {
  const kv = memoryKv();
  let release = () => {};
  const set = kv.setItemAsync;
  kv.setItemAsync = async (key: string, value: string) => {
    if (key === 'reminders.cue') await new Promise<void>((resolve) => (release = resolve));
    return set(key, value);
  };
  const { reminders } = await make(kv);
  const saving = reminders.setCue('Old account words');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const forgetting = reminders.forget();
  release();
  await Promise.all([saving, forgetting]);
  expect(reminders.current().cue).toBe('');
  expect(kv.items.has('reminders.cue')).toBe(false);
});

test('a state declared while they are scheduled clears them; lifted, they come back', async () => {
  let declared = false;
  const device = fakeDevice();
  const reminders = await createReminders({ kv: memoryKv(), access: device.access, now: () => now, report: jest.fn(), muted: async () => declared });
  await reminders.keepSchedule(schedule);
  await reminders.opened();
  await reminders.turnOn();
  expect(kinds(device.scheduled)).toEqual(['training', 'check_in', 'quiet']);
  declared = true;
  await reminders.opened();
  expect(device.scheduled).toEqual([]);
  declared = false;
  await reminders.opened();
  expect(kinds(device.scheduled)).toEqual(['training', 'check_in', 'quiet']);
});

test('a state with a last day plans the slots after it by date, with no open needed (K-518)', async () => {
  const device = fakeDevice();
  const reminders = await createReminders({ kv: memoryKv(), access: device.access, now: () => now, report: jest.fn(), muted: async () => true,
    mutedUntil: async () => '2026-10-06' });
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  expect(device.scheduled.length).toBeGreaterThan(0);
  expect(device.scheduled.every((r) => 'at' in r.when)).toBe(true);
});

describe('opens are tracked (trackOpens)', () => {
  function foreground() {
    let listener = () => {};
    return { trigger: (l: () => void) => ((listener = l), () => (listener = () => {})), come: () => listener() };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test('at start and each time the app comes to the front, signed in', async () => {
    const opened = jest.fn(async () => {});
    const front = foreground();
    trackOpens(opened, async () => true, front.trigger);
    await settle();
    expect(opened).toHaveBeenCalledTimes(1);
    front.come();
    await settle();
    expect(opened).toHaveBeenCalledTimes(2);
  });

  test('signed out, or the keychain cannot say: no open is counted', async () => {
    const opened = jest.fn(async () => {});
    const front = foreground();
    trackOpens(opened, async () => false, front.trigger);
    front.come();
    trackOpens(opened, async () => Promise.reject(new Error('locked')), foreground().trigger);
    await settle();
    expect(opened).not.toHaveBeenCalled();
  });

  test('stopping stops it', async () => {
    const opened = jest.fn(async () => {});
    const front = foreground();
    const stop = trackOpens(opened, async () => true, front.trigger);
    await settle();
    stop();
    front.come();
    await settle();
    expect(opened).toHaveBeenCalledTimes(1);
  });
});

test('a sign-out while "on" is being kept: the next account does not find them on', async () => {
  const kv = memoryKv();
  let release = () => {};
  const set = kv.setItemAsync;
  kv.setItemAsync = async (key: string, value: string) => {
    if (key === 'reminders.enabled') await new Promise<void>((resolve) => (release = resolve));
    return set(key, value);
  };
  const { reminders, device } = await make(kv);
  const turning = reminders.turnOn();
  await new Promise((resolve) => setTimeout(resolve, 0)); // iOS allowed; "on" is being written
  const forgetting = reminders.forget();
  release();
  await Promise.all([turning, forgetting]);
  expect(reminders.current().enabled).toBe(false);
  await reminders.keepSchedule(schedule); // the next account's profile
  expect(device.scheduled).toEqual([]);
});

describe("the user's own changes fail visibly; the phone's scheduling does not", () => {
  function failing(key: string) {
    const kv = memoryKv();
    const set = kv.setItemAsync;
    const remove = kv.removeItemAsync;
    const fail = async () => {
      throw Object.assign(new Error('disk full'), { name: 'StorageFailed' });
    };
    kv.setItemAsync = async (k: string, v: string) => (k === key ? fail() : set(k, v));
    kv.removeItemAsync = async (k: string) => (k === key ? fail() : remove(k));
    return kv;
  }

  test('a sentence that cannot be kept: the caller hears it, reported by name, and nothing changes', async () => {
    const { reminders, report } = await make(failing('reminders.cue'));
    await expect(reminders.setCue('After work')).rejects.toThrow('disk full');
    expect(reminders.current().cue).toBe('');
    expect(report).toHaveBeenCalledWith({ name: 'StorageFailed' });
  });

  test('"off" that cannot be kept: the caller hears it, and they stay on', async () => {
    const kv = memoryKv();
    const { reminders } = await make(kv);
    await reminders.turnOn();
    kv.removeItemAsync = async () => {
      throw Object.assign(new Error('disk full'), { name: 'StorageFailed' });
    };
    await expect(reminders.turnOff()).rejects.toThrow('disk full');
    expect(reminders.current().enabled).toBe(true);
  });

  test('"on" that cannot be kept: the caller hears it, and they stay off', async () => {
    const { reminders } = await make(failing('reminders.enabled'));
    await expect(reminders.turnOn()).rejects.toThrow('disk full');
    expect(reminders.current().enabled).toBe(false);
  });

  test('a failed step does not stop the next one', async () => {
    const { reminders, device } = await make(failing('reminders.cue'));
    await reminders.keepSchedule(schedule);
    await reminders.setCue('x').catch(() => {});
    await reminders.turnOn();
    expect(kinds(device.scheduled)).toContain('training');
  });
});

describe('a week off (ADR-037 › 51b)', () => {
  test('kept: no weekly training reminder while it is on; the check-in stays; over, weekly again', async () => {
    const { reminders, device } = await make();
    await reminders.keepSchedule(schedule);
    await reminders.turnOn();
    await reminders.keepRestUntil('2026-10-05');
    expect(device.scheduled.filter((r) => r.kind === 'training' && 'weekday' in r.when)).toEqual([]);
    expect(kinds(device.scheduled)).toContain('check_in');
    await reminders.keepRestUntil(null);
    expect(device.scheduled.filter((r) => r.kind === 'training' && 'weekday' in r.when)).toHaveLength(1);
  });

  test('kept across a start, and forgotten at sign-out', async () => {
    const kv = memoryKv();
    const { reminders } = await make(kv);
    await reminders.keepRestUntil('2026-10-05');
    expect(kv.items.get('reminders.restUntil')).toBe('2026-10-05');
    await reminders.forget();
    expect(kv.items.has('reminders.restUntil')).toBe(false);
  });
});

test("a week off read for the account that left (the read began before the sign-out) is not kept for the next one", async () => {
  const kv = memoryKv();
  const { reminders } = await make(kv);
  const era = reminders.era(); // Today's read begins
  await reminders.forget(); // sign-out while it reads
  await reminders.keepRestUntil('2026-10-05', era); // the read ends
  expect(kv.items.has('reminders.restUntil')).toBe(false);
  await reminders.keepRestUntil('2026-10-05', reminders.era()); // a read of the new account
  expect(kv.items.get('reminders.restUntil')).toBe('2026-10-05');
});

test('the same week off read again changes nothing: no rebuild of the reminders', async () => {
  const { reminders, device } = await make();
  await reminders.keepSchedule(schedule);
  await reminders.turnOn();
  await reminders.keepRestUntil('2026-10-05');
  const before = device.replaced;
  await reminders.keepRestUntil('2026-10-05');
  await reminders.keepRestUntil('2026-10-05');
  expect(device.replaced).toBe(before);
});

describe('the first call day (K-992), kept from the server\'s answer', () => {
  test('kept, the check-in morning waits for it; made, weekly; off, none', async () => {
    const { reminders, device } = await make();
    await reminders.keepSchedule(schedule);
    await reminders.turnOn({ only: 'check_in' });
    await reminders.keepFirstCall({ on: '2026-10-05' });
    expect(device.scheduled.map((r) => r.when)).toEqual([{ at: new Date(2026, 9, 5, 9, 0) }, { at: new Date(2026, 9, 12, 9, 0) }]);
    await reminders.keepFirstCall('weekly');
    expect(device.scheduled.map((r) => r.when)).toEqual([{ weekday: 2, hour: 9, minute: 0 }]);
    await reminders.keepFirstCall('off');
    expect(device.scheduled).toEqual([]);
  });

  test('kept across launches; nothing kept is weekly, as before K-992', async () => {
    const kv = memoryKv();
    const first = await make(kv);
    await first.reminders.keepFirstCall({ on: '2026-10-05' });
    const { reminders, device } = await make(kv);
    await reminders.keepSchedule(schedule);
    await reminders.turnOn({ only: 'check_in' });
    expect(device.scheduled.map((r) => r.when)).toEqual([{ at: new Date(2026, 9, 5, 9, 0) }, { at: new Date(2026, 9, 12, 9, 0) }]);
    const fresh = await make();
    await fresh.reminders.keepSchedule(schedule);
    await fresh.reminders.turnOn({ only: 'check_in' });
    expect(fresh.device.scheduled.map((r) => r.when)).toEqual([{ weekday: 2, hour: 9, minute: 0 }]);
  });

  test('a read that began for an account that left is dropped; a sign-out forgets the day', async () => {
    const { reminders, kv } = await make();
    const era = reminders.era();
    await reminders.forget();
    await reminders.keepFirstCall({ on: '2026-10-05' }, era);
    expect(kv.items.size).toBe(0);
    await reminders.keepFirstCall({ on: '2026-10-05' });
    await reminders.forget();
    expect(kv.items.size).toBe(0);
  });
});
