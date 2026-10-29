/**
 * The one confirmation of a save (ADR-070 Ek 2 #6, K-1044): a screen that keeps a weigh-in, a cardio session or a meal
 * publishes it as it closes, and the app's banner says "Saved" with Undo above the tab bar, for the time of the parameter.
 * One at a time: a second save replaces the first; once the banner is gone the save cannot be taken back from here.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { t } from '@/copy';
import { SavedProvider, type Save, type Undone, useSaved } from '@/saved/saved';
import { type Removal, undoThrough } from '@/saved/undo';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { workoutParams } from '@/train/params';

import { Saver, WithSaved, banner, publishSave, undoButton } from './support/saved';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

beforeEach(() => {
  jest.useFakeTimers();
  announce.mockClear();
  alert.mockClear();
});
afterEach(() => jest.useRealTimers());

const renderIt = (ui?: ReactElement) =>
  render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <Saver />
        {ui}
      </WithSaved>
    </ThemeProvider>,
  );
const done: () => Promise<Undone> = async () => ({ done: true });
const save = (detail: string, undo: Save['undo'] = done) => publishSave({ detail, undo });
const press = async () => {
  await fireEvent.press(undoButton());
  await act(async () => {});
};

test('nothing saved, no banner', async () => {
  await renderIt();
  expect(banner()).toBeNull();
});

test('a save shows "Saved" with its detail and Undo', async () => {
  await renderIt();
  await save('80.2 kg');
  expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
  expect(screen.getByText('80.2 kg')).toBeOnTheScreen();
  expect(undoButton()).toBeOnTheScreen();
});

// K-1048 (prototype `.bnr.up`): the "+" sits at the bottom right just above the tab bar, a primary button's size with the screen's
// small gap under it; a banner at the tab bar's height covered it for its whole time. The banner stands over the "+" instead.
test('it sits above the tab bar and above the "+": the home indicator, the bar, the gap, the button, and a little air', async () => {
  await render(
    <ThemeProvider scheme="light">
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 34 }}>
        <WithSaved>
          <Saver />
        </WithSaved>
      </SafeAreaInsetsContext.Provider>
    </ThemeProvider>,
  );
  await save('80.2 kg');
  const bottom = StyleSheet.flatten(screen.getByTestId('undo-banner').props.style).bottom as number;
  const plusTop = 34 + tokens.size.tabBar + tokens.space.sm + tokens.size.primaryButton; // the "+": its gap above the bar, then its own height
  expect(bottom).toBe(plusTop + tokens.space.sm);
  expect(bottom).toBeGreaterThan(plusTop); // clear of the button's top edge, so it stays visible and tappable
});

test('Undo takes the save back through its own undo, once, and the banner goes', async () => {
  const undo = jest.fn(done);
  await renderIt();
  await save('80.2 kg', undo);
  await press();
  expect(undo).toHaveBeenCalledTimes(1);
  expect(banner()).toBeNull();
});

test('taken back: what is said is told to VoiceOver', async () => {
  await renderIt();
  await save('80.2 kg', async () => ({ done: true, said: 'Weigh-in taken back.' }));
  await press();
  expect(announce).toHaveBeenCalledWith('Weigh-in taken back.');
});

test('it goes by itself after the time of the parameter, and not before', async () => {
  await renderIt();
  await save('80.2 kg');
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs - 1));
  expect(banner()).toBeOnTheScreen();
  await act(async () => jest.advanceTimersByTime(1));
  expect(banner()).toBeNull();
});

test('once it is gone there is no Undo to press: the save cannot be taken back from here', async () => {
  const undo = jest.fn(done);
  await renderIt();
  await save('80.2 kg', undo);
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs));
  expect(screen.queryByRole('button', { name: t('undoBanner.undo') })).toBeNull();
  expect(undo).not.toHaveBeenCalled();
});

test('a second save replaces the first: one banner, the new detail, and the first one is not undone by it', async () => {
  const first = jest.fn(done);
  const second = jest.fn(done);
  await renderIt();
  await save('80.2 kg', first);
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs - 1000));
  await save('Cardio 30 min', second);

  expect(screen.getAllByTestId('undo-banner')).toHaveLength(1);
  expect(screen.queryByText('80.2 kg')).toBeNull();
  expect(screen.getByText('Cardio 30 min')).toBeOnTheScreen();

  // The new one has its own time, from its own start.
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs - 1));
  expect(banner()).toBeOnTheScreen();
  await press();
  expect(second).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();
});

test('the first banner timing out late does not take the second one down', async () => {
  await renderIt();
  await save('80.2 kg');
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs - 1));
  await save('Lunch, 3 items');
  await act(async () => jest.advanceTimersByTime(1)); // the first one's time is up now
  expect(screen.getByText('Lunch, 3 items')).toBeOnTheScreen();
});

describe('Undo that did not work', () => {
  test('a failure that may pass (offline): said, aloud and on the screen, and the banner is back with Undo', async () => {
    const undo = jest
      .fn<Promise<Undone>, []>()
      .mockResolvedValueOnce({ done: false, message: t('weighIn.undoOffline'), again: true })
      .mockResolvedValueOnce({ done: true });
    await renderIt();
    await save('80.2 kg', undo);

    await press();

    expect(alert).toHaveBeenCalledWith(t('weighIn.undoOffline'));
    expect(announce).toHaveBeenCalledWith(t('weighIn.undoOffline'));
    expect(screen.getByText('80.2 kg')).toBeOnTheScreen();

    await press(); // the connection is back
    expect(undo).toHaveBeenCalledTimes(2);
    expect(banner()).toBeNull();
  });

  test('a refusal for good: said, and the banner does not come back', async () => {
    await renderIt();
    await save('Cardio 30 min', async () => ({ done: false, message: t('workout.cardio.undoLate'), again: false }));
    await press();
    expect(alert).toHaveBeenCalledWith(t('workout.cardio.undoLate'));
    expect(banner()).toBeNull();
  });

  test('an undo that throws is a failure to try again, not a crash', async () => {
    await renderIt();
    await save('80.2 kg', async () => {
      throw new Error('boom');
    });
    await press();
    expect(alert).toHaveBeenCalledWith(t('undoBanner.failed'));
    expect(banner()).toBeOnTheScreen();
  });
});

test('a screen drawn with no banner around it (a test, a preview) can save: told to nobody', async () => {
  let publish: (save: Save) => void = () => {};
  function Alone() {
    publish = useSaved();
    return null;
  }
  await render(<Alone />);
  expect(() => publish({ undo: done })).not.toThrow();
});

test('a provider without the banner draws nothing of its own', async () => {
  await render(
    <ThemeProvider scheme="light">
      <SavedProvider>
        <Saver />
      </SavedProvider>
    </ThemeProvider>,
  );
  await save('80.2 kg');
  expect(banner()).toBeNull();
});

describe('undoThrough: the answers of a take-back as the banner shows them', () => {
  const words = { said: 'taken', offline: 'offline words', failed: 'failed words' };
  const through = (answer: Removal | Error, extra: { conflict?: string } = {}) => {
    const report = jest.fn();
    const undo = undoThrough(async () => {
      if (answer instanceof Error) throw answer;
      return answer;
    }, report, { ...words, ...extra });
    return { undo, report };
  };

  test('taken: done, with the words for VoiceOver', async () => {
    expect(await through('taken').undo()).toEqual({ done: true, said: 'taken' });
  });

  test('offline: its own words, to try again', async () => {
    expect(await through('offline').undo()).toEqual({ done: false, message: 'offline words', again: true });
  });

  test('a conflict without words of its own is a failure to try again', async () => {
    expect(await through('conflict').undo()).toEqual({ done: false, message: 'failed words', again: true });
  });

  test('a conflict with words of its own is said and final', async () => {
    expect(await through('conflict', { conflict: 'too late' }).undo()).toEqual({ done: false, message: 'too late', again: false });
  });

  test('a thrown error is reported by name only and counts as a failure to try again', async () => {
    const { undo, report } = through(Object.assign(new Error('secret detail'), { name: 'StoreFailed' }));
    expect(await undo()).toEqual({ done: false, message: 'failed words', again: true });
    expect(report).toHaveBeenCalledWith({ name: 'StoreFailed' });
  });
});
