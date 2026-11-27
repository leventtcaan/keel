/**
 * The meal a new meal is logged into is the meal screen's title (ADR-094 Ek 4 #1): its name in the serif, and the system's list of the
 * four meals behind it. These helpers read the title and answer that list as a person would.
 */
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ALL_SLOTS } from '@/food/slots';

type Slot = components['schemas']['MealSlot'];

/** The title's meal name, when it names this meal. */
export const titleSlot = (slot: Slot) => within(screen.getByTestId('meal-picker')).queryByText(t(`food.slot.${slot}`));

/** Opens the list of meals from the title and picks this one. */
export async function chooseSlot(slot: Slot): Promise<void> {
  const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(ALL_SLOTS.indexOf(slot)));
  await fireEvent.press(screen.getByTestId('meal-picker'));
  await act(async () => {});
  sheet.mockRestore();
}

/** Opens the list of meals from the title, answers Cancel, and returns the options it offered (the four meals, then Cancel). */
export async function slotOptions(): Promise<string[]> {
  let seen: string[] = [];
  const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((options, callback) => {
    seen = options.options;
    callback(options.cancelButtonIndex ?? -1);
  });
  await fireEvent.press(screen.getByTestId('meal-picker'));
  await act(async () => {});
  sheet.mockRestore();
  return seen;
}
