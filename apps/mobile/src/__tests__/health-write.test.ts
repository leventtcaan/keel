/**
 * Writing to Apple Health (K-412, ADR-018 §1, ADR-031): a finished session as a workout, and — separately — a weigh-in
 * typed in. Each has its own switch, off until turned on; iOS's write permission is asked apart from the read one, and
 * without it no write call is made. What the app writes is marked, so reading Health back never brings it in twice.
 */
import { healthKitAccess, healthKitWrite } from '@/health/healthKit';
import { createHealthWriting } from '@/health/healthWrite';
import { workoutParams } from '@/train/params';

const STRENGTH = 50; // HKWorkoutActivityType.traditionalStrengthTraining, the installed library's WorkoutActivityType
const AUTHORIZED = 2; // AuthorizationStatus.sharingAuthorized

function kit(status: Record<string, number> = {}) {
  const calls: { name: string; args: unknown[] }[] = [];
  return {
    calls,
    status,
    isHealthDataAvailable: () => true,
    requestAuthorization: async (request: unknown) => (calls.push({ name: 'requestAuthorization', args: [request] }), true),
    authorizationStatusFor: (type: string) => status[type] ?? 0,
    saveWorkoutSample: async (...args: unknown[]) => (calls.push({ name: 'saveWorkoutSample', args }), {}),
    saveQuantitySample: async (...args: unknown[]) => (calls.push({ name: 'saveQuantitySample', args }), undefined),
    queryQuantitySamples: async () => [
      { uuid: 'mine', startDate: new Date('2026-10-01T05:00:00Z'), quantity: 81, metadata: { HKExternalUUID: 'keel:w-1' } },
      { uuid: 'scale', startDate: new Date('2026-10-01T06:00:00Z'), quantity: 81.2, metadata: {} },
    ],
  };
}

describe('the phone (healthKitWrite)', () => {
  const access = (fake: ReturnType<typeof kit>) =>
    healthKitWrite(
      () => fake,
      () => false,
    );

  test('not in Expo Go, nor where the library will not load', () => {
    expect(healthKitWrite(() => kit(), () => true).available).toBe(false);
    expect(
      healthKitWrite(
        () => {
          throw new Error('no native module');
        },
        () => false,
      ).available,
    ).toBe(false);
  });

  test("iOS's sheet asks for the one type being turned on — a 'no' to the other is never given before it is asked", async () => {
    const fake = kit();
    await access(fake).requestWrite('workout');
    await access(fake).requestWrite('weight');
    expect(fake.calls).toEqual([
      { name: 'requestAuthorization', args: [{ toShare: ['HKWorkoutTypeIdentifier'] }] },
      { name: 'requestAuthorization', args: [{ toShare: ['HKQuantityTypeIdentifierBodyMass'] }] },
    ]);
  });

  test('allowed is what iOS says for each type (write status, unlike read, is told)', () => {
    const fake = kit({ HKWorkoutTypeIdentifier: AUTHORIZED, HKQuantityTypeIdentifierBodyMass: 1 });
    expect(access(fake).canWrite('workout')).toBe(true);
    expect(access(fake).canWrite('weight')).toBe(false);
    expect(access(kit()).canWrite('workout')).toBe(false); // not asked yet (0) is not allowed
  });

  test('a workout: strength training from start to end, marked as the app\'s', async () => {
    const fake = kit();
    const start = new Date('2026-10-02T17:00:00Z');
    const end = new Date('2026-10-02T18:05:00Z');
    await access(fake).writeWorkout({ id: 'w-1', start, end });
    // The sync identifier makes HealthKit keep one sample per record: a finish done again never adds a second workout.
    const mark = { HKExternalUUID: 'keel:w-1', HKSyncIdentifier: 'keel:w-1', HKSyncVersion: 1 };
    expect(fake.calls).toEqual([{ name: 'saveWorkoutSample', args: [STRENGTH, [], start, end, undefined, mark] }]);
  });

  test('a weigh-in: kilograms at its moment, entered by hand, marked as the app\'s', async () => {
    const fake = kit();
    const at = new Date('2026-10-02T07:00:00Z');
    await access(fake).writeWeight({ id: 'wi-1', kg: 81.4, at });
    expect(fake.calls).toEqual([
      {
        name: 'saveQuantitySample',
        args: ['HKQuantityTypeIdentifierBodyMass', 'kg', 81.4, at, at, { HKExternalUUID: 'keel:wi-1', HKSyncIdentifier: 'keel:wi-1', HKSyncVersion: 1, HKWasUserEntered: true }],
      },
    ]);
  });

  test('reading weights back skips what the app wrote: no weigh-in comes in twice (K-402)', async () => {
    const weights = await healthKitAccess(
      () => kit(),
      () => false,
    ).readWeights(new Date('2026-09-25'), new Date('2026-10-02'));
    expect(weights.map((w) => w.id)).toEqual(['scale']);
  });
});

describe('the switches (createHealthWriting)', () => {
  function memoryKv() {
    const items = new Map<string, string>();
    return {
      items,
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => items.delete(key),
    };
  }
  function phone({ available = true, allowed = { workout: true, weight: true } } = {}) {
    const written: { kind: string; value: unknown }[] = [];
    const access = {
      available,
      requestWrite: jest.fn(async (_kind: 'workout' | 'weight') => {}),
      canWrite: (kind: 'workout' | 'weight') => allowed[kind],
      writeWorkout: jest.fn(async (value: unknown) => void written.push({ kind: 'workout', value })),
      writeWeight: jest.fn(async (value: unknown) => void written.push({ kind: 'weight', value })),
    };
    return { access, written, allowed };
  }
  const workout = { id: 'w-1', start: new Date('2026-10-02T17:00:00Z'), end: new Date('2026-10-02T18:00:00Z') };
  const weighIn = { id: 'wi-1', kg: 81.4, at: new Date('2026-10-02T07:00:00Z') };

  test('off until turned on: a finished session and a weigh-in write nothing', async () => {
    const { access, written } = phone();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    expect(writing.current()).toEqual({ workouts: false, weighIns: false });
    await writing.workoutFinished(workout);
    await writing.weighInSaved(weighIn);
    expect(written).toEqual([]);
  });

  test('turning workouts on asks iOS; allowed, a finished session is written — weigh-ins stay off, apart', async () => {
    const { access, written } = phone();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    expect(await writing.turnOn('workouts')).toBe(true);
    expect(access.requestWrite.mock.calls).toEqual([['workout']]);
    await writing.turnOn('weighIns');
    expect(access.requestWrite.mock.calls).toEqual([['workout'], ['weight']]);
    await writing.turnOff('weighIns');
    await writing.workoutFinished(workout);
    await writing.weighInSaved(weighIn);
    expect(written).toEqual([{ kind: 'workout', value: workout }]);
  });

  test('refused by iOS: the switch stays off and no write call is made', async () => {
    const { access } = phone({ allowed: { workout: false, weight: false } });
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    expect(await writing.turnOn('weighIns')).toBe(false);
    expect(writing.current().weighIns).toBe(false);
    await writing.weighInSaved(weighIn);
    expect(access.writeWeight).not.toHaveBeenCalled();
  });

  test('on, but taken back in the Health app since: no write call', async () => {
    const { access, allowed } = phone();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    await writing.turnOn('workouts');
    allowed.workout = false;
    await writing.workoutFinished(workout);
    expect(access.writeWorkout).not.toHaveBeenCalled();
  });

  test('where Apple Health is not in the build: nothing is asked, nothing turns on', async () => {
    const { access } = phone({ available: false });
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    expect(await writing.turnOn('workouts')).toBe(false);
    expect(access.requestWrite).not.toHaveBeenCalled();
    await writing.workoutFinished(workout);
    expect(access.writeWorkout).not.toHaveBeenCalled();
  });

  test('the choice is kept, and turned off it stops writing', async () => {
    const kv = memoryKv();
    const { access, written } = phone();
    const writing = await createHealthWriting({ kv, access, report: jest.fn() });
    await writing.turnOn('weighIns');
    const restarted = await createHealthWriting({ kv, access, report: jest.fn() });
    expect(restarted.current()).toEqual({ workouts: false, weighIns: true });
    await restarted.turnOff('weighIns');
    await restarted.weighInSaved(weighIn);
    expect(written).toEqual([]);
    expect((await createHealthWriting({ kv, access, report: jest.fn() })).current().weighIns).toBe(false);
  });

  test('a write that fails is reported by name; the session and the weigh-in are not held up', async () => {
    const { access } = phone();
    access.writeWorkout.mockRejectedValueOnce(Object.assign(new Error('HKError 5'), { name: 'HealthWriteFailed' }));
    const report = jest.fn();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report });
    await writing.turnOn('workouts');
    await expect(writing.workoutFinished(workout)).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledWith({ name: 'HealthWriteFailed' });
  });

  test('a sign-out forgets both switches', async () => {
    const kv = memoryKv();
    const { access } = phone();
    const writing = await createHealthWriting({ kv, access, report: jest.fn() });
    await writing.turnOn('workouts');
    await writing.turnOn('weighIns');
    await writing.forget();
    expect(writing.current()).toEqual({ workouts: false, weighIns: false });
    expect([...kv.items.keys()]).toEqual([]);
  });

  test('a session open far longer than any session (left unfinished for days) is not written: Health would keep a made-up length', async () => {
    const { access } = phone();
    const report = jest.fn();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report });
    await writing.turnOn('workouts');
    const hours = (n: number) => n * 3_600_000;
    const longest = workoutParams.healthWorkoutMaxMinutes * 60_000;
    await writing.workoutFinished({ ...workout, end: new Date(workout.start.getTime() + longest) });
    expect(access.writeWorkout).toHaveBeenCalledTimes(1);
    await writing.workoutFinished({ ...workout, end: new Date(workout.start.getTime() + longest + hours(1)) });
    expect(access.writeWorkout).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ name: 'WorkoutTooLongForHealth' });
  });

  test('what the switch shows: on only while iOS still allows it; turned on but taken back in Health, refused', async () => {
    const { access, allowed } = phone();
    const writing = await createHealthWriting({ kv: memoryKv(), access, report: jest.fn() });
    expect(writing.shown('workouts')).toBe('off');
    await writing.turnOn('workouts');
    expect(writing.shown('workouts')).toBe('on');
    allowed.workout = false;
    expect(writing.shown('workouts')).toBe('refused');
  });
});
