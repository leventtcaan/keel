import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { consentVersion, loadConsents, withdrawConsent, type PhoneConsentStatus } from '@/consent/consents';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { Section } from './Section';
import { useAction } from './useAction';

type Offer = components['schemas']['AiConsentOffer'];
type Item = components['schemas']['CoachMemoryItem'];

const WORDS = { NoConnection: 'settings.coach.failed' };

/** A change that did not take: named, so the failure is worded and never carries the server's message (V3). */
function refused(name: 'Refused' | 'NoConnection'): Error {
  return Object.assign(new Error('coach settings'), { name });
}

/**
 * Settings › Coach and AI (ADR-092 #3, #5): the AI consent the coach is given to (the provider and the data are the server's to
 * name, V2; the text is the one the consent screen shows), what the coach was asked to remember, each with Forget, and the
 * conversation, which can be cleared. The coach remembers only what the user told it to (Remember this, in the conversation); here
 * they see it and delete it. Withdrawing the consent deletes the conversation and the memory on the server.
 */
export function CoachSettings() {
  const { api, consents } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [outcome, setOutcome] = useState<string | null>(null);

  // Read whenever the page comes into view, and again after a change.
  const read = useCallback(async () => {
    const [states, offered, remembered] = await Promise.all([
      loadConsents(api).catch(() => null),
      load(() => api.GET('/v1/consents/ai-offer')),
      load(() => api.GET('/v1/coach/memory')),
    ]);
    return {
      status: (states === null ? 'unread' : (states.THIRD_PARTY_AI ?? 'NEVER_ASKED')) as PhoneConsentStatus | 'unread',
      offer: offered.state === 'ready' ? offered.value : null,
      items: remembered.state === 'ready' ? remembered.value.items : null,
    };
  }, [api]);
  const { data, reload } = useReadOnFocus(read);
  const status = data?.status ?? 'unread';
  const offer: Offer | null = data?.offer ?? null;
  const items: Item[] | null = data?.items ?? null;

  const allow = async () => {
    if (offer === null) return;
    const done = await run(async () => {
      let answer;
      try {
        answer = await api.PUT('/v1/consents/{kind}', {
          params: { path: { kind: 'THIRD_PARTY_AI' } },
          body: { textVersion: consentVersion('THIRD_PARTY_AI'), provider: offer.provider, dataTypes: offer.dataTypes },
        });
      } catch {
        throw refused('NoConnection');
      }
      if (answer.data === undefined) throw refused('Refused');
      await consents.remember('THIRD_PARTY_AI', 'GRANTED').catch(() => undefined);
    }, WORDS);
    if (done) reload();
  };

  const withdraw = async () => {
    const done = await run(async () => {
      await withdrawConsent(api, 'THIRD_PARTY_AI');
      await consents.remember('THIRD_PARTY_AI', 'WITHDRAWN').catch(() => undefined);
    }, WORDS);
    if (done) reload();
  };

  const forget = async (item: Item) => {
    const done = await run(async () => {
      const answer = await api.DELETE('/v1/coach/memory/{id}', { params: { path: { id: item.id } } }).catch(() => {
        throw refused('NoConnection');
      });
      if (!answer.response.ok) throw refused('Refused');
    }, WORDS);
    if (done) {
      setOutcome(t('settings.coach.forgot'));
      reload();
    }
  };

  const clear = async () => {
    const done = await run(async () => {
      const answer = await api.DELETE('/v1/coach/history').catch(() => {
        throw refused('NoConnection');
      });
      if (!answer.response.ok) throw refused('Refused');
    }, WORDS);
    if (done) setOutcome(t('settings.coach.cleared'));
  };

  const granted = status === 'GRANTED';
  const unavailable = offer === null && !granted && status !== 'unread';
  // Built outside the JSX children (the raw-text guard reads them).
  const consentBody =
    offer === null ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t(unavailable ? 'settings.coach.unavailable' : 'settings.consents.loadFailed')}</Text>
    ) : (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.third_party_ai.body', { provider: offer.provider })}</Text>
    );
  const consentWay = granted ? (
    <Button label={t('settings.coach.withdraw')} variant="ghost" size="sm" onPress={() => void withdraw()} disabled={busy} />
  ) : offer === null ? null : (
    <Button label={t('settings.coach.allow')} size="sm" onPress={() => void allow()} disabled={busy} />
  );
  const list =
    items === null ? null : items.length === 0 ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('settings.coach.memoryNone')}</Text>
    ) : (
      items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Text style={[styles.text, styles.itemText, { color: color.text }]}>{item.text}</Text>
          <Button
            label={t('settings.coach.forget')}
            accessibilityLabel={`${t('settings.coach.forget')}: ${item.text}`}
            variant="ghost"
            size="sm"
            onPress={() => void forget(item)}
            disabled={busy}
          />
        </View>
      ))
    );
  return (
    <View style={styles.page}>
      <Section title={t('settings.coach.consent')}>
        {consentBody}
        {consentWay}
      </Section>
      <Section title={t('settings.coach.memory')}>{list}</Section>
      <Section title={t('settings.coach.conversation')}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('settings.coach.conversationLine')}</Text>
        <Button label={t('settings.coach.clear')} variant="ghost" size="sm" onPress={() => void clear()} disabled={busy} />
      </Section>
      {outcome === null ? null : <Text style={[styles.text, { color: color.muted }]}>{outcome}</Text>}
      {problem === null ? null : <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: tokens.space.xl },
  text: { fontSize: tokens.type.body },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
  itemText: { flex: 1 },
});
