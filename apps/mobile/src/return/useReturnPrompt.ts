import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { TABS } from '@/navigation/tabs';
import { useAppServices } from '@/services/ServicesProvider';

import { readReturn } from './returnApi';

/** Where the tabs are: This week is the root, the others their own name. */
const TAB_PATHS: ReadonlySet<string> = new Set(TABS.map((tab) => (tab.name === 'index' ? '/' : `/${tab.name}`)));

/**
 * Asks the return question when the app opens (K-981, ADR-077 #5 and Ek 6): once the tabs are up, and each time the app
 * comes back to the front, the server is asked (GET /v1/return) and the return screen opens over the tabs only when it
 * says `shouldPrompt`. The phone counts no days and knows no gap; an answer it cannot get (no connection, an error) asks
 * nothing, and the next opening asks again. It opens only over a tab: a person in the middle of a workout or a weigh-in
 * is not stepped in front of, and the question waits for the next opening.
 */
export function useReturnPrompt(): void {
  const { api } = useAppServices();
  const pathname = usePathname();
  // Read when the answer comes, not when the question was asked: the person may have moved on meanwhile.
  const where = useRef(pathname);
  useEffect(() => {
    where.current = pathname;
  }, [pathname]);
  const asking = useRef(false);

  useEffect(() => {
    const ask = async () => {
      if (asking.current) return;
      asking.current = true;
      try {
        const read = await readReturn(api);
        if (read.state === 'ready' && read.value.shouldPrompt && TAB_PATHS.has(where.current)) router.push('/return');
      } finally {
        asking.current = false;
      }
    };
    void ask();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ask();
    });
    return () => subscription.remove();
  }, [api]);
}
