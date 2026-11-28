import type { ReactNode } from 'react';

import { GuideGroup } from '@/guide/GuideGroup';

import { AccountSection } from './AccountSection';
import { AppearanceSection } from './AppearanceSection';
import { CoachSettings } from './CoachSettings';
import { DataSourcesGroup } from './DataSources';
import { HealthGroup } from './HealthGroup';
import { LanguageSection } from './LanguageSection';
import { LegalGroup } from './LegalGroup';
import { RateGroup } from './RateGroup';
import { RemindersSection } from './RemindersSection';
import type { SectionId } from './sections';
import { SubscriptionSection } from './SubscriptionSection';
import { UnitsSection } from './UnitsSection';
import { WeekSection } from './WeekSection';
import { YouSection } from './YouSection';

/**
 * What each chapter of Settings holds (K-1257, ADR-094 Ek 9): the groups Settings had, each on the page of its chapter, none
 * dropped. The coach's chapter is the coach's settings themselves (ADR-092); the account's actions sit under the page's own title.
 * Your week, You and the health rows follow the health data consent (`granted`) as they did.
 */
export function SettingsSection({ section, granted }: { section: SectionId; granted: boolean | null }): ReactNode {
  switch (section) {
    case 'week':
      return <WeekSection />;
    case 'you':
      return <YouSection granted={granted} />;
    case 'reminders':
      return <RemindersSection />;
    case 'health':
      return <HealthGroup granted={granted} />;
    case 'coach':
      return <CoachSettings />;
    case 'subscription':
      return <SubscriptionSection />;
    case 'app':
      return (
        <>
          <AppearanceSection />
          <LanguageSection />
          <UnitsSection />
        </>
      );
    case 'about':
      return (
        <>
          <GuideGroup />
          <RateGroup />
          <DataSourcesGroup />
          <LegalGroup />
        </>
      );
    case 'account':
      return <AccountSection />;
  }
}
