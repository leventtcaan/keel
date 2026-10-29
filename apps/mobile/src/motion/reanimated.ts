/**
 * The one place the app names react-native-reanimated. Every movement imports it from here, so the tests can stand a stand-in in
 * its place (src/__tests__/support/reanimatedShim.tsx, set up in jest.setup.ts): expo-router's test renderer swaps the library
 * itself for an empty mock, and the app's movements must not depend on that. Every movement asks useReduceMotion (K-807) before it
 * moves: the hooks in this folder take its answer.
 */
export { default } from 'react-native-reanimated';
export { Easing, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
export type { SharedValue } from 'react-native-reanimated';
