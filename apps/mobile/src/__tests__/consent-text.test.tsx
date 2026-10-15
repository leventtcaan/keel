/**
 * The text a consent is given to, as a screen shows it (K-1032, Levent 15 Oct). The health data text is a list of short
 * points, each one a stop for VoiceOver; the other consents are one paragraph. The same component is every screen's
 * (onboarding, Settings, the gates on weigh-in, meals, recipes and state), so the text cannot differ between them.
 */
import { render, screen } from '@testing-library/react-native';

import { HEALTH_POINTS } from '@/consent/consents';
import { ConsentText } from '@/consent/ConsentText';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

const show = (kind: 'HEALTH_DATA' | 'APPLE_HEALTH') =>
  render(
    <ThemeProvider scheme="light">
      <ConsentText kind={kind} />
    </ThemeProvider>,
  );

test('the health data text is a list of its points, in order', async () => {
  await show('HEALTH_DATA');
  expect(screen.getByTestId('consent-list').props.accessibilityRole).toBe('list');
  const items = screen.getAllByTestId('consent-point');
  expect(items).toHaveLength(HEALTH_POINTS.length);
  HEALTH_POINTS.forEach((point, index) => {
    expect(items[index]).toHaveTextContent(t(`consent.health_data.points.${point}`));
  });
});

test('each point is one stop for VoiceOver, read whole (the bullet is not read)', async () => {
  await show('HEALTH_DATA');
  const items = screen.getAllByTestId('consent-point');
  HEALTH_POINTS.forEach((point, index) => {
    expect(items[index].props.accessible).toBe(true);
    expect(items[index].props.accessibilityLabel).toBe(t(`consent.health_data.points.${point}`));
  });
});

test('a consent with one paragraph (Apple Health) shows it as the paragraph, not a list', async () => {
  await show('APPLE_HEALTH');
  expect(screen.getByText(t('consent.apple_health.body'))).toBeOnTheScreen();
  expect(screen.queryByTestId('consent-list')).toBeNull();
  expect(screen.queryAllByTestId('consent-point')).toHaveLength(0);
});
