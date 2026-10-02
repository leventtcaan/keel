/**
 * Writing to Apple Health (K-412, ADR-018 §1, ADR-031): a finished session as a workout, and — separately — a weigh-in
 * typed in. Each has its own switch, off until turned on; iOS's write permission is asked apart from the read one, and
 * without it no write call is made. What the app writes is marked, so reading Health back never brings it in twice.
 */
import { healthKitAccess, healthKitWrite } from '@/health/healthKit';
import { createHealthWriting } from '@/health/healthWrite';

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

  test("iOS's sheet asks to write exactly two things — workouts and weight — and to read nothing more", async () => {
    const fake = kit();
    await access(fake).requestWrite();
    expect(fake.calls).toEqual([
      { name: 'requestAuthorization', args: [{ toShare: ['HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierBodyMass'] }] },
    ]);
  });

  test('allowed is what iOS says for each type (write status, unlike read, is told)', () => {
    const fake = kit({ HKWorkoutTypeIdentifier: AUTHORIZED, HKQuantityTypeIdentifierBodyMass: 1 });
    expect(access(fake).canWrite('workout')).toBe(true);
    expect(access(fake).canWrite('weight')).toBe(false);
  });

  test('a workout: strength training from start to end, marked as the app\'s', async () => {
    const fake = kit();
    const start = new Date('2026-10-02T17:00:00Z');
    const end = new Date('2026-10-02T18:05:00Z');
    await access(fake).writeWorkout({ id: 'w-1', start, end });
    expect(fake.calls).toEqual([{ name: 'saveWorkoutSample', args: [STRENGTH, [], start, end, undefined, { HKExternalUUID: 'keel:w-1' }] }]);
  });

  test('a weigh-in: kilograms at its moment, entered by hand, marked as the app\'s', async () => {
    const fake = kit();
    const at = new Date('2026-10-02T07:00:00Z');
    await access(fake).writeWeight({ id: 'wi-1', kg: 81.4, at });
    expect(fake.calls).toEqual([
      { name: 'saveQuantitySample', args: ['HKQuantityTypeIdentifierBodyMass', 'kg', 81.4, at, at, { HKExternalUUID: 'keel:wi-1', HKWasUserEntered: true }] },
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
      requestWrite: jest.fn(async () => {}),
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
    expect(access.requestWrite).toHaveBeenCalledTimes(1);
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
});
