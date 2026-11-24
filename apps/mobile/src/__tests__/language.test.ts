/** The language choice (K-1211): System follows the device, a pick is kept on the phone and wins. */
import { createLanguage } from '@/copy/language';
import { DEFAULT_LOCALE, activeLocale, setActiveLocale } from '@/copy/locales';
import type { KeyValue } from '@/units/preference';

function memoryKv(initial: Record<string, string> = {}): KeyValue & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    removeItemAsync: async (key) => data.delete(key),
  };
}

afterEach(() => setActiveLocale(DEFAULT_LOCALE));

test('System until chosen: a Turkish phone shows Turkish, any other phone English', async () => {
  const tr = await createLanguage({ kv: memoryKv(), deviceLocale: 'tr-TR' });
  expect(tr.current()).toBe('system');
  expect(tr.locale()).toBe('tr');
  expect(activeLocale()).toBe('tr');
  const de = await createLanguage({ kv: memoryKv(), deviceLocale: 'de-DE' });
  expect(de.locale()).toBe('en');
  expect(activeLocale()).toBe('en');
});

test('a choice wins over the device, and is kept', async () => {
  const kv = memoryKv();
  const language = await createLanguage({ kv, deviceLocale: 'tr-TR' });
  await language.set('en');
  expect(language.locale()).toBe('en');
  expect(activeLocale()).toBe('en');
  expect(kv.data.get('language')).toBe('en');
});

test('the choice survives a restart', async () => {
  const kv = memoryKv();
  await (await createLanguage({ kv, deviceLocale: 'en-US' })).set('tr');
  setActiveLocale('en');
  const again = await createLanguage({ kv, deviceLocale: 'en-US' });
  expect(again.current()).toBe('tr');
  expect(activeLocale()).toBe('tr');
});

test('System again follows the device, and a stored value this app does not know is ignored', async () => {
  const kv = memoryKv({ language: 'klingon' });
  const language = await createLanguage({ kv, deviceLocale: 'tr-TR' });
  expect(language.current()).toBe('system');
  await language.set('en');
  await language.set('system');
  expect(language.locale()).toBe('tr');
});

test('listeners hear a change of the language shown, not a repeat', async () => {
  const language = await createLanguage({ kv: memoryKv(), deviceLocale: 'en-US' });
  const heard = jest.fn();
  language.subscribe(heard);
  await language.set('tr');
  await language.set('tr');
  expect(heard).toHaveBeenCalledTimes(1);
});

test('sign-out forgets the choice: the next person starts on System', async () => {
  const kv = memoryKv();
  const language = await createLanguage({ kv, deviceLocale: 'tr-TR' });
  await language.set('en');
  await language.forget();
  expect(kv.data.has('language')).toBe(false);
  expect(language.current()).toBe('system');
  expect(activeLocale()).toBe('tr');
});
