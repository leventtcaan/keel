// Jest setup (K-1065): the native animation runtime is not there under Jest; src/__tests__/support/reanimatedShim.tsx stands in
// for the app's one door to react-native-reanimated (src/motion/reanimated.ts), and worklets run on the one thread.
jest.mock('@/motion/reanimated', () => require('./src/__tests__/support/reanimatedShim'));
// The bar a number pad carries (InputAccessoryView) is not part of the screen: iOS draws it with the keyboard. Under Jest it is
// left out, so a screen's own "Done" is found by its text; the keyboard's tests turn it on (globalThis.__showKeyboardAccessory).
jest.mock('react-native/Libraries/Components/TextInput/InputAccessoryView', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => ((globalThis as { __showKeyboardAccessory?: boolean }).__showKeyboardAccessory === true ? children : null),
}));
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (run: (...args: unknown[]) => void, ...args: unknown[]) => run(...args),
}));
