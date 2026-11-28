/**
 * Every chapter of Settings drawn together (K-1257): what the Settings screen held on one page before it became contents, so the
 * tests of its groups find each row where it lives now. Each chapter is the page `settings-section` shows; the contents page
 * itself is settings-contents.test.tsx.
 */
import { SECTIONS } from '@/settings/sections';
import { SettingsSection } from '@/settings/SettingsSection';
import { useHealthConsent } from '@/settings/useHealthConsent';

export function AllChapters() {
  const granted = useHealthConsent();
  return (
    <>
      {SECTIONS.map((section) => (
        <SettingsSection key={section} section={section} granted={granted} />
      ))}
    </>
  );
}
