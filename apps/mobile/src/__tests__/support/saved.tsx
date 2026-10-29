/**
 * The app's one banner for a save, as the root layout mounts it: a screen under test is drawn beside it, so a save the
 * screen publishes can be seen, undone and timed out the way the person meets it. Put inside a ThemeProvider.
 */
import { act, screen } from '@testing-library/react-native';
import { type ReactNode, useEffect } from 'react';

import { t } from '@/copy';
import { SavedBanner, SavedProvider, type Save, useSaved } from '@/saved/saved';

export function WithSaved({ children }: { children: ReactNode }) {
  return (
    <SavedProvider>
      {children}
      <SavedBanner />
    </SavedProvider>
  );
}

let publisher: (save: Save) => void = () => {};
/** A stand-in for the screen that saved: draw it inside WithSaved, then `publishSave` says something was saved. */
export function Saver() {
  const publish = useSaved();
  useEffect(() => {
    publisher = publish;
  }, [publish]);
  return null;
}
/** Something was saved, as a closing sheet says it. */
export const publishSave = (save: Save) => act(async () => publisher(save));

/** The banner's Undo. */
export const undoButton = () => screen.getByRole('button', { name: t('undoBanner.undo') });
/** The banner, if it is up. */
export const banner = () => screen.queryByTestId('undo-banner');
