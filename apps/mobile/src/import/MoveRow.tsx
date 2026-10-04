import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { findMoves } from '@/train/moves';
import { OwnMoveForm, type SaveOutcome } from '@/train/OwnMoveForm';
import { exerciseName } from '@/train/program';
import type { Move } from '@/train/trainData';
import { workoutParams } from '@/train/params';

import type { Matched } from './match';

type Schemas = components['schemas'];

type Props = {
  matched: Matched;
  /** The move this name is brought in as; null: left out. */
  chosen: string | null;
  moves: Move[];
  byId: ReadonlyMap<string, Move>;
  onPick: (id: string | null) => void;
  onSavedOwn: (own: Schemas['CustomExercise']) => void;
};

/**
 * One name of the file (K-609, U5): brought in as a move — shown, and changeable — or not brought in. Unsure, the closest
 * moves are offered one tap each; "Other" finds any move by name; "My own move" makes one (K-416, the engine's questions
 * asked, never assumed). Left out, its sets stay in the file.
 */
export function MoveRow({ matched, chosen, moves, byId, onPick, onSavedOwn }: Props) {
  const { api, training, report } = useAppServices();
  const { color } = useTheme();
  const [mode, setMode] = useState<'view' | 'search' | 'own'>('view');
  const [query, setQuery] = useState('');
  const file = matched.name;
  const take = (id: string | null) => {
    onPick(id);
    setMode('view');
  };

  // Saved online, as on the session screen (K-416): kept on the phone from the server's answer at once.
  const saveOwn = async (body: Schemas['NewCustomExercise']): Promise<SaveOutcome> => {
    try {
      const { data: kept, error } = await api.POST('/v1/custom-exercises', { body });
      if (kept === undefined) {
        report({ name: error?.code ?? 'Unknown' });
        return 'refused';
      }
      await training.saved(kept);
      onSavedOwn(kept);
      setMode('view');
      return 'saved';
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      return 'offline';
    }
  };

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const offers = mode === 'view' && chosen === null && matched.suggestions.length > 0;
  const searching = mode === 'search';
  const below =
    mode === 'own' ? (
      <OwnMoveForm
        name={[...file].slice(0, workoutParams.ownMoveNameMaxChars).join('')}
        catalog={moves}
        onPick={(id) => take(id)}
        onSave={saveOwn}
        onBack={() => setMode('view')}
      />
    ) : (
      <Actions file={file} chosen={chosen} searching={searching} onOther={() => setMode(searching ? 'view' : 'search')} onOwn={() => setMode('own')} onSkip={() => take(null)} />
    );
  return (
    <View style={[styles.row, { borderColor: color.line }]}>
      <Text style={[styles.name, { color: color.text }]}>{file}</Text>
      <Text style={[styles.small, { color: color.muted }]}>{t('import.sets', { count: matched.sets })}</Text>
      <Status chosen={chosen} byId={byId} />
      {offers && <Offers file={file} ids={matched.suggestions} byId={byId} onPick={(id) => take(id)} />}
      {searching && <Search file={file} query={query} onQuery={setQuery} moves={moves} byId={byId} onPick={(id) => take(id)} />}
      {below}
    </View>
  );
}

function Status({ chosen, byId }: { chosen: string | null; byId: ReadonlyMap<string, Move> }) {
  const { color } = useTheme();
  const words = chosen === null ? t('import.notMatched') : t('import.matched', { move: exerciseName(chosen, byId) });
  return <Text style={[styles.text, { color: color.text }]}>{words}</Text>;
}

function Offers({ file, ids, byId, onPick }: { file: string; ids: string[]; byId: ReadonlyMap<string, Move>; onPick: (id: string) => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.offers}>
      <Text style={[styles.small, { color: color.muted }]}>{t('import.unsure')}</Text>
      <View style={styles.buttons}>
        {ids.map((id) => (
          <PickButton key={id} file={file} id={id} byId={byId} onPick={onPick} />
        ))}
      </View>
    </View>
  );
}

function PickButton({ file, id, byId, onPick }: { file: string; id: string; byId: ReadonlyMap<string, Move>; onPick: (id: string) => void }) {
  const move = exerciseName(id, byId);
  return <Button label={move} accessibilityLabel={t('import.pickLabel', { move, file })} variant="ghost" size="sm" onPress={() => onPick(id)} />;
}

function Search(props: {
  file: string;
  query: string;
  onQuery: (query: string) => void;
  moves: Move[];
  byId: ReadonlyMap<string, Move>;
  onPick: (id: string) => void;
}) {
  const found = findMoves(props.query, props.moves);
  return (
    <View style={styles.offers}>
      <TextField label={t('import.search')} value={props.query} onChangeText={props.onQuery} onSearch={() => undefined} />
      <View style={styles.buttons}>
        {found.map((m) => (
          <PickButton key={m.id} file={props.file} id={m.id} byId={props.byId} onPick={props.onPick} />
        ))}
      </View>
    </View>
  );
}

function Actions(props: { file: string; chosen: string | null; searching: boolean; onOther: () => void; onOwn: () => void; onSkip: () => void }) {
  const skip =
    props.chosen === null ? null : (
      <Button label={t('import.skip')} accessibilityLabel={t('import.skipLabel', { file: props.file })} variant="ghost" size="sm" onPress={props.onSkip} />
    );
  return (
    <View style={styles.buttons}>
      <Button
        label={t(props.searching ? 'import.back' : 'import.other')}
        accessibilityLabel={props.searching ? undefined : t('import.otherLabel', { file: props.file })}
        variant="ghost"
        size="sm"
        onPress={props.onOther}
      />
      <Button label={t('import.own')} accessibilityLabel={t('import.ownLabel', { file: props.file })} variant="ghost" size="sm" onPress={props.onOwn} />
      {skip}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: tokens.space.xs, paddingVertical: tokens.space.sm, borderBottomWidth: tokens.border.hairline },
  offers: { gap: tokens.space.xs },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
