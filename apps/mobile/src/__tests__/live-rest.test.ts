/**
 * The rest as a Live Activity (K-1215, ADR-094): the port starts it with the rest, moves it, ends it, and hears its buttons; and a build
 * without the native module (an older development build) still starts and feels nothing (K-1026's lesson). The module is read
 * on first use, so each test loads the port afresh.
 */
import type { RestLiveProps } from '@/train/liveRest';

const props: RestLiveProps = {
  title: 'Bench press',
  next: 'Next: set 2, 80 kg × 8',
  label: 'Rest',
  less: '-15',
  more: '+15',
  ready: 'Ready',
  accent: '#35D7CF',
  since: 1_000_000,
  endsAt: 1_120_000,
};

type Press = (event: { source: string; target: string }) => void;

function load(options: { missing?: 'widgets' | 'activity'; stale?: number } = {}) {
  const activity = { update: jest.fn(async (_p: RestLiveProps) => undefined), end: jest.fn(async (_policy?: string) => undefined) };
  const stale = Array.from({ length: options.stale ?? 0 }, () => ({ end: jest.fn(async (_policy?: string) => undefined) }));
  const start = jest.fn((_p: RestLiveProps) => activity);
  let press: Press | null = null;
  const remove = jest.fn();
  jest.doMock('expo-widgets', () => {
    if (options.missing === 'widgets') throw new Error('Cannot find native module ExpoWidgets');
    return {
      addUserInteractionListener: (listener: Press) => {
        press = listener;
        return { remove };
      },
    };
  });
  jest.doMock('@/train/liveRestActivity', () => {
    if (options.missing === 'activity') throw new Error('Cannot find native view ExpoUI');
    return { restActivity: { start, getInstances: () => stale } };
  });
  let port!: typeof import('@/train/liveRest').liveRest;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    port = (require('@/train/liveRest') as typeof import('@/train/liveRest')).liveRest;
  });
  return { port, activity, stale, start, remove, press: (target: string) => press?.({ source: 'KeelRest', target }) };
}

afterEach(() => jest.resetModules());

describe('liveRest', () => {
  test('a rest starts one activity with what the screen says', () => {
    const { port, start } = load();
    port.show(props);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(props);
  });

  test('a second show moves the activity under way instead of starting another', () => {
    const { port, start, activity } = load();
    port.show(props);
    port.show({ ...props, endsAt: props.endsAt + 15_000 });
    expect(start).toHaveBeenCalledTimes(1);
    expect(activity.update).toHaveBeenCalledWith({ ...props, endsAt: props.endsAt + 15_000 });
  });

  test('the end is never before the start (a rest shortened past its beginning): the system clock needs a range', () => {
    const { port, start } = load();
    port.show({ ...props, endsAt: props.since - 50_000 });
    expect(start).toHaveBeenCalledWith({ ...props, endsAt: props.since + 1000 });
  });

  test("an activity an earlier run left on the lock screen goes before the new one starts", () => {
    const { port, stale } = load({ stale: 2 });
    port.show(props);
    for (const old of stale) expect(old.end).toHaveBeenCalledWith('immediate');
  });

  test('stop ends the activity at once, and a second stop does nothing more', () => {
    const { port, activity } = load();
    port.show(props);
    port.stop();
    port.stop();
    expect(activity.end).toHaveBeenCalledTimes(1);
    expect(activity.end).toHaveBeenCalledWith('immediate');
  });

  test('after a stop the next rest starts a fresh activity', () => {
    const { port, start } = load();
    port.show(props);
    port.stop();
    port.show(props);
    expect(start).toHaveBeenCalledTimes(2);
  });

  test('stop before any rest touches nothing (not even the native module)', () => {
    const { port, start } = load();
    port.stop();
    expect(start).not.toHaveBeenCalled();
  });

  test('the buttons are heard as presses; any other target is not', () => {
    const { port, press } = load();
    const heard: string[] = [];
    port.onPress((p) => heard.push(p));
    press('less');
    press('more');
    press('ready');
    press('something else');
    expect(heard).toEqual(['less', 'more', 'ready']);
  });

  test('listening stops when asked', () => {
    const { port, remove } = load();
    port.onPress(() => undefined)();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('the phone refusing is not the user\'s problem: a failing start, update and end throw nothing', async () => {
    const { port, start, activity } = load();
    start.mockImplementationOnce(() => {
      throw new Error('ActivityKit refused');
    });
    expect(() => port.show(props)).not.toThrow();
    activity.update.mockRejectedValueOnce(new Error('refused'));
    activity.end.mockRejectedValueOnce(new Error('refused'));
    port.show(props); // starts (the first failed)
    port.show(props); // updates (rejects)
    expect(() => port.stop()).not.toThrow();
    await Promise.resolve();
  });

  describe.each([['widgets' as const], ['activity' as const]])('a build whose %s module is missing (K-1026)', (missing) => {
    test('loading the port does not throw, and nothing happens', () => {
      const { port, start } = load({ missing });
      expect(() => {
        port.show(props);
        port.show(props);
        port.stop();
      }).not.toThrow();
      expect(start).not.toHaveBeenCalled();
    });

    test('listening gives back a stopper that works', () => {
      const { port } = load({ missing });
      const stop = port.onPress(() => undefined);
      expect(() => stop()).not.toThrow();
    });
  });
});
