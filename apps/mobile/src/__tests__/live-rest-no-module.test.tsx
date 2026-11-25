/**
 * The app starts, and a rest goes by, in a build without `expo-widgets` (an older development build, K-1026's lesson: a native module
 * that threw when loaded crashed the app at launch). Here both packages are ones whose loading throws, as the native module does
 * when it is missing; the rest's own code (the screen's `RestLive` and the port) is loaded and used. If anything loads either at
 * the top of a file, in whatever import form, the import fails; if a call is not guarded, it throws. `virtual` so the guard holds
 * wherever the packages are installed.
 */
import { render } from '@testing-library/react-native';

const mockLoaded = jest.fn();
jest.mock(
  'expo-widgets',
  () => {
    mockLoaded('expo-widgets');
    throw new Error("Cannot find native module 'ExpoWidgets'");
  },
  { virtual: true },
);
jest.mock(
  '@expo/ui/swift-ui',
  () => {
    mockLoaded('@expo/ui/swift-ui');
    throw new Error("Cannot find native view 'ExpoUI'");
  },
  { virtual: true },
);

test('a rest is shown, moved, and ended, and the screen part of it renders, with neither package loadable', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RestLive } = require('@/train/RestLive') as typeof import('@/train/RestLive');
  const draw = (endsAt: number) => <RestLive since={1000} endsAt={endsAt} title="Bench press" next="Next: set 2" onShift={jest.fn()} onReady={jest.fn()} />;
  expect(mockLoaded).not.toHaveBeenCalled(); // loading the file did not touch them
  const view = await render(draw(121_000));
  await view.rerender(draw(136_000));
  await view.unmount();
  expect(mockLoaded).toHaveBeenCalled(); // they were asked for, once a rest was shown, and the failure was swallowed
});
