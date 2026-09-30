import { useRef, useState } from 'react';

import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * One action at a time on a settings screen: a second tap while one is on its way does nothing (a ref, which both taps
 * share), a failure is reported by name only (V3) and worded by what went wrong — no connection, or `failedKey` for a
 * named error the caller words itself, or `otherwise` (the server's fault unless said).
 */
export function useAction() {
  const { report } = useAppServices();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const running = useRef(false);

  async function run(action: () => Promise<void>, words: Record<string, string>, otherwise = 'settings.serverError'): Promise<boolean> {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await action();
      return true;
    } catch (error) {
      const name = nameOf(error);
      report({ name });
      setProblem(t(words[name] ?? otherwise));
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return { busy, problem, run };
}
