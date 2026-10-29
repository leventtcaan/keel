import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type { GuideMark } from './guide';

/** The first-use guide as the screens meet it (K-1065). */
export type Guide = {
  /** The guide is on the screen. */
  open: boolean;
  /**
   * This week is in view with its content: opens the guide the first time, or when Settings asked for it. Later arrivals do nothing.
   * Called on every arrival; cheap.
   */
  arrive: () => void;
  /** Settings' "How it works": the guide opens the next time This week is in view. */
  request: () => void;
  /** Done or skipped. */
  close: () => void;
};

// Outside a provider (a screen under test) there is no guide.
const NoGuide: Guide = { open: false, arrive: () => {}, request: () => {}, close: () => {} };
const GuideContext = createContext<Guide>(NoGuide);

/** Held at the root of the app, so Settings can ask for the guide and This week, under it, draws it. */
export function GuideProvider({ mark, children }: { mark: GuideMark; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const asked = useRef(false);
  const checking = useRef(false);
  const arrive = useCallback(() => {
    if (asked.current) {
      asked.current = false;
      setOpen(true);
      return;
    }
    if (checking.current) return;
    checking.current = true;
    void mark
      .seen()
      .then((seen) => {
        if (seen) return;
        setOpen(true);
        return mark.markSeen();
      })
      .catch(() => undefined) // a mark that cannot be kept: the guide was shown, and may be shown again at the next start
      .finally(() => {
        checking.current = false;
      });
  }, [mark]);
  const request = useCallback(() => {
    asked.current = true;
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const guide = useMemo(() => ({ open, arrive, request, close }), [open, arrive, request, close]);
  return <GuideContext.Provider value={guide}>{children}</GuideContext.Provider>;
}

export function useGuide(): Guide {
  return useContext(GuideContext);
}
