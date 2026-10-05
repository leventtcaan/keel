import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { answer, choiceKey, leadsTo, type Prompt } from '@/prompts/prompts';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
const idOf = (prompt: Prompt) => `${prompt.rule}/${prompt.key}`;

/**
 * The coach's question on Today (K-520, ADR-039): one at a time (U9) — the next waits for the next read of Today. An
 * answer is sent once; its reply takes the answers' place, or the screen it leads to opens. Not sent: said once, the
 * answers stay. Questions that could not be read show nothing: they are the coach's, not a part of the week.
 */
export function PromptCard({ read }: { read: { state: 'ready'; value: Prompt[] } }) {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  // What happened to a question shown here: answered (with its reply, if any), or not sent — the latter only for the read
  // it was shown in: a new read of Today is a new try (K-520 review).
  const [outcome, setOutcome] = useState<{ id: string; reply: string | null } | { id: string; failed: string; read: object } | null>(null);
  const prompt = read.value[0];
  if (prompt === undefined) return null;
  const id = idOf(prompt);
  const here = outcome?.id === id ? outcome : null;
  if (here !== null && 'reply' in here && here.reply === null) return null;

  async function choose(choice: string) {
    setBusy(true);
    try {
      const reply = await answer(api, prompt, choice);
      setOutcome({ id, reply });
      const destination = leadsTo(prompt, choice);
      if (destination !== null) router.push(destination);
    } catch (error) {
      const name = nameOf(error);
      report({ name });
      // No connection is the user's to fix; a refusal is ours (as the state screen, K-518).
      setOutcome({ id, failed: name === 'NoConnection' ? 'today.prompt.failed' : 'today.prompt.refused', read });
    } finally {
      setBusy(false);
    }
  }

  const reply = here !== null && 'reply' in here ? here.reply : null;
  const failed = here !== null && 'failed' in here && here.read === read ? here.failed : null;
  return (
    <Card>
      <Text style={[styles.title, { color: color.text }]}>{t(`${prompt.copyKey}.title`)}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t(`${prompt.copyKey}.body`)}</Text>
      {reply !== null ? (
        <Text style={[styles.text, { color: color.text }]}>{t(reply)}</Text>
      ) : (
        <View style={styles.choices}>
          {prompt.choices.map((choice) => (
            <Button key={choice} label={t(choiceKey(prompt, choice))} variant="ghost" size="sm" onPress={() => void choose(choice)} disabled={busy} />
          ))}
        </View>
      )}
      {failed !== null ? <ProblemText style={[styles.text, { color: color.textSecondary }]} occurrence={here}>
          {t(failed)}
        </ProblemText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  choices: { gap: tokens.space.sm },
});
