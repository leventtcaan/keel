/**
 * The language choice (K-1211, ADR-091): System (the phone's language), English or Türkçe, System until the person picks.
 * A phone setting like the appearance: kept on the phone only, never sent. The language showing is set here, as
 * the active language the copy and the formatters read (locales.ts).
 */
import type { KeyValue } from '@/units/preference';

import { type Language, type Locale, isLanguage, matchLocale, setActiveLocale } from './locales';

const KEY = 'language';

export type LanguagePreference = Awaited<ReturnType<typeof createLanguage>>;

/** `deviceLocale`: the phone's locale tag (BCP 47), for "System". */
export async function createLanguage({ kv, deviceLocale }: { kv: KeyValue; deviceLocale: string }) {
  const kept = await kv.getItemAsync(KEY);
  let choice: Language = isLanguage(kept) ? kept : 'system';
  const resolve = (): Locale => (choice === 'system' ? matchLocale(deviceLocale) : choice);
  let shown = resolve();
  setActiveLocale(shown);
  const listeners = new Set<() => void>();

  return {
    /** What is chosen (System, English, Türkçe). Synchronous, for rendering (useSyncExternalStore). */
    current: (): Language => choice,

    /** The language showing. */
    locale: (): Locale => shown,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Sign-out: the language belongs to the account's phone use, so the next person starts on System. */
    forget: async (): Promise<void> => {
      await kv.removeItemAsync(KEY);
      if (choice === 'system') return;
      choice = 'system';
      shown = resolve();
      setActiveLocale(shown);
      listeners.forEach((listener) => listener());
    },

    set: async (next: Language): Promise<void> => {
      await kv.setItemAsync(KEY, next);
      if (next === choice) return;
      choice = next;
      shown = resolve();
      setActiveLocale(shown);
      listeners.forEach((listener) => listener());
    },
  };
}
