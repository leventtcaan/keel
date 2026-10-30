/**
 * UndoBanner (ADR-070 Ek 2 #6, K-1041): after a save, a short band at the bottom of the screen, "Saved" with an optional
 * detail and "Undo"; it goes by itself after a few seconds (a parameter), says itself to VoiceOver, and does not slide in
 * when Reduce Motion is on.
 */
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { UndoBanner } from '@/components/UndoBanner';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const reduceMotion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');

beforeEach(() => {
  jest.useFakeTimers();
  announce.mockClear();
  reduceMotion.mockResolvedValue(false);
});
afterEach(() => {
  jest.useRealTimers();
});

const renderIt = (ui: ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

test('shows "Saved" and an Undo button, on the inverse band', async () => {
  await renderIt(<UndoBanner onUndo={() => {}} onDismiss={() => {}} />);
  expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('undoBanner.undo') })).toBeOnTheScreen();
  expect(StyleSheet.flatten(screen.getByTestId('undo-banner').props.style)).toMatchObject({ backgroundColor: palettes.light.decisionBackground });
  expect(StyleSheet.flatten(screen.getByText(t('undoBanner.saved')).props.style).color).toBe(palettes.light.decisionText);
});

test('an optional detail follows', async () => {
  await renderIt(<UndoBanner detail="72.5 kg" onUndo={() => {}} onDismiss={() => {}} />);
  expect(screen.getByText('72.5 kg')).toBeOnTheScreen();
});

test('Undo calls back, once, and the banner goes', async () => {
  const onUndo = jest.fn();
  const onDismiss = jest.fn();
  await renderIt(<UndoBanner onUndo={onUndo} onDismiss={onDismiss} />);
  await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(screen.getByRole('button', { name: t('undoBanner.undo') }));
  expect(onUndo).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('undo-banner')).toBeNull();
  // The timer was stopped by the tap: nothing is dismissed twice.
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs * 2));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('hides by itself after the duration from the parameter, and not before', async () => {
  const onDismiss = jest.fn();
  await renderIt(<UndoBanner onUndo={() => {}} onDismiss={onDismiss} />);
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs - 1));
  expect(screen.getByTestId('undo-banner')).toBeOnTheScreen();
  expect(onDismiss).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(screen.queryByTestId('undo-banner')).toBeNull();
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('a duration given by the caller wins over the parameter', async () => {
  const onDismiss = jest.fn();
  await renderIt(<UndoBanner durationMs={1000} onUndo={() => {}} onDismiss={onDismiss} />);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('the parameter is a few seconds', () => {
  expect(workoutParams.undoBannerMs).toBeGreaterThanOrEqual(3000);
  expect(workoutParams.undoBannerMs).toBeLessThanOrEqual(10000);
});

test('VoiceOver is told: "Saved", the detail, and that there is an undo', async () => {
  await renderIt(<UndoBanner detail="72.5 kg" onUndo={() => {}} onDismiss={() => {}} />);
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(t('undoBanner.announce', { detail: '72.5 kg' }));
  expect(t('undoBanner.announce', { detail: '72.5 kg' })).toContain('72.5 kg');
});

test('with no detail the announcement has no gap in it', async () => {
  await renderIt(<UndoBanner onUndo={() => {}} onDismiss={() => {}} />);
  expect(announce).toHaveBeenCalledWith(t('undoBanner.announceBare'));
});

test('Reduce Motion on: the banner is there whole at once, not faded in', async () => {
  reduceMotion.mockResolvedValue(true);
  await renderIt(<UndoBanner onUndo={() => {}} onDismiss={() => {}} />);
  await act(async () => {});
  expect(StyleSheet.flatten(screen.getByTestId('undo-banner').props.style).opacity).toBe(1);
});

test('a lead says what happened in place of "Saved": "Deleted" and what, once each, and VoiceOver hears the same (K-1066)', async () => {
  await renderIt(<UndoBanner lead="Deleted" detail="Breakfast" onUndo={() => {}} onDismiss={() => {}} />);
  expect(screen.getByText('Deleted')).toBeOnTheScreen();
  expect(screen.getByText('Breakfast')).toBeOnTheScreen();
  expect(screen.queryByText(t('undoBanner.saved'))).toBeNull();
  expect(announce).toHaveBeenCalledWith(t('undoBanner.announceLead', { lead: 'Deleted', detail: 'Breakfast' }));
});

// Evre 7 B5: a rebuilt program cannot be taken back (the server keeps no copy), so its banner says what happened and goes: no Undo
// button, and VoiceOver is not told "Undo is available".
test('with no Undo to give: the words only, no button, and VoiceOver hears the words as they stand', async () => {
  const onDismiss = jest.fn();
  await renderIt(<UndoBanner lead="Program rebuilt" detail="4 days · 27 moves" onDismiss={onDismiss} />);
  expect(screen.getByText('Program rebuilt')).toBeOnTheScreen();
  expect(screen.getByText('4 days · 27 moves')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('undoBanner.undo') })).toBeNull();
  expect(announce).toHaveBeenCalledWith('Program rebuilt, 4 days · 27 moves');
  await act(async () => jest.advanceTimersByTime(workoutParams.undoBannerMs));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
