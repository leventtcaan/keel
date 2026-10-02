/**
 * The rest timer in the background (K-411): when a rest starts, the phone is told to say "rest's up" once the band's
 * lower end has passed (G1 K-49) — so the user who locked the phone still hears it. Only where iOS allows notifications
 * (it is never asked for mid-set); a new set moves it, the end of the session takes it away.
 */
import { t } from '@/copy';
import { type AlertAccess, createRestAlert } from '@/train/restAlert';
import { workoutParams } from '@/train/params';
import { restText } from '@/train/session';

function phone(granted = true) {
  const alerts = new Map<string, { at: Date; title: string; body: string }>();
  const access: AlertAccess = {
    permission: async () => ({ granted, canAskAgain: !granted }),
    alertAt: async (id, at, title, body) => void alerts.set(id, { at, title, body }),
    cancel: async (id) => void alerts.delete(id),
  };
  return { access, alerts };
}

const since = new Date(2026, 9, 2, 18, 0, 0).getTime();

test("a rest that starts: one alert at the band's lower end, in the copy's words", async () => {
  const { access, alerts } = phone();
  await createRestAlert({ access, report: jest.fn() }).start(since);
  expect([...alerts.values()]).toEqual([
    {
      at: new Date(since + workoutParams.restSecondsMin * 1000),
      title: t('workout.rest.alert.title'),
      body: t('workout.rest.alert.body', { min: restText(workoutParams.restSecondsMin) }),
    },
  ]);
});

test('a new rest moves it: still one alert, at the new time', async () => {
  const { access, alerts } = phone();
  const rest = createRestAlert({ access, report: jest.fn() });
  await rest.start(since);
  await rest.start(since + 90_000);
  expect([...alerts.values()].map((a) => a.at)).toEqual([new Date(since + 90_000 + workoutParams.restSecondsMin * 1000)]);
});

test('stopping takes it away', async () => {
  const { access, alerts } = phone();
  const rest = createRestAlert({ access, report: jest.fn() });
  await rest.start(since);
  await rest.stop();
  expect(alerts.size).toBe(0);
});

test('iOS has not allowed notifications: nothing is set (and AlertAccess has no way to ask mid-set)', async () => {
  const { access, alerts } = phone(false);
  await createRestAlert({ access, report: jest.fn() }).start(since);
  expect(alerts.size).toBe(0);
});

test('a phone that fails is reported by name; the set is not held up', async () => {
  const { access } = phone();
  access.alertAt = async () => {
    throw Object.assign(new Error('no'), { name: 'AlertFailed' });
  };
  const report = jest.fn();
  await expect(createRestAlert({ access, report }).start(since)).resolves.toBeUndefined();
  expect(report).toHaveBeenCalledWith({ name: 'AlertFailed' });
});

test('its id is not a reminder\'s: rebuilding the reminders never takes the rest alert away (ADR-036)', async () => {
  const { access, alerts } = phone();
  await createRestAlert({ access, report: jest.fn() }).start(since);
  expect([...alerts.keys()].every((id) => !id.startsWith('reminder:'))).toBe(true);
});
