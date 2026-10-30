/**
 * A logged item swiped to delete (K-1063; Evre 7 walk finding): a fast long swipe used to delete the row without showing its Delete. Now a
 * swipe shows the red Delete and waits for a tap, only a swipe all the way across deletes at once (the app's banner offers Undo either way),
 * and VoiceOver has the custom action on the row.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { foodParams } from '@/food/params';
import { SwipeRow } from '@/food/SwipeRow';
import { ThemeProvider } from '@/theme/theme';

const onDelete = jest.fn();
beforeEach(() => onDelete.mockClear());

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <SwipeRow testID="row" label="Delete" onDelete={onDelete}>
        <Text>Oats</Text>
      </SwipeRow>
    </ThemeProvider>,
  );
}

test('the Delete behind the row is a button of its own: a tap on it deletes', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByTestId('row-delete', { includeHiddenElements: true })));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("VoiceOver deletes with the row's custom action, and the button behind is left out of its reading", async () => {
  await show();
  // Called on the prop: a row that is a gesture responder is, to the test library, not a target for an accessibility event.
  await act(async () => screen.getByTestId('row').props.onAccessibilityAction({ nativeEvent: { actionName: 'delete' } }));
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('row-delete', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
});

test('a short swipe shows the button, a full swipe deletes: the two thresholds are parameters, the button comes first', () => {
  expect(foodParams.swipeRevealFraction).toBeLessThan(foodParams.swipeFullFraction);
  expect(foodParams.swipeFullFraction).toBeLessThan(1);
  expect(foodParams.swipeDeletePx).toBeGreaterThan(0);
});
