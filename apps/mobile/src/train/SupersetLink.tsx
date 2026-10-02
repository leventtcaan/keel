import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { t } from "@/copy";
import { useTheme } from "@/theme/theme";
import { tokens } from "@/theme/tokens";

import { exerciseName } from "./program";
import type { Move } from "./trainData";

type Props = {
  /** The names of the move's partners in its superset; empty when it is in none. */
  partners: string[];
  /** The session's moves it can be paired with (in no superset yet), by id and name. */
  candidates: { id: string; name: string }[];
  onLink: (exerciseId: string) => void;
  onUnlink: () => void;
};

/** In the history (K-416): a move done in a superset says its partners; one in none says nothing. */
export function SupersetLine({
  partners,
  moves,
}: {
  partners: string[] | undefined;
  moves: ReadonlyMap<string, Move>;
}) {
  const { color } = useTheme();
  if (partners === undefined) return null;
  const names = partners
    .map((id) => exerciseName(id, moves))
    .join(t("superset.separator"));
  return (
    <Text style={[styles.small, { color: color.accent }]}>
      {t("superset.with", { names })}
    </Text>
  );
}

/** The move under way's superset (K-416): its partners and a way out, or a way in with a move of the session. */
export function SupersetLink({
  partners,
  candidates,
  onLink,
  onUnlink,
}: Props) {
  const { color } = useTheme();
  const [picking, setPicking] = useState(false);
  if (partners.length > 0) {
    return (
      <View style={styles.row}>
        <Text style={[styles.small, styles.grow, { color: color.accent }]}>
          {t("superset.with", {
            names: partners.join(t("superset.separator")),
          })}
        </Text>
        <Button
          label={t("superset.unlink")}
          variant="ghost"
          size="sm"
          onPress={onUnlink}
        />
      </View>
    );
  }
  if (candidates.length === 0) return null;
  if (!picking)
    return (
      <Button
        label={t("superset.link")}
        variant="ghost"
        size="sm"
        onPress={() => setPicking(true)}
      />
    );
  return (
    <View style={styles.picking}>
      <Text style={[styles.small, { color: color.textSecondary }]}>
        {t("superset.choose")}
      </Text>
      <View style={styles.chips}>
        {candidates.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            accessibilityLabel={t("superset.pick", { name: c.name })}
            onPress={() => {
              setPicking(false);
              onLink(c.id);
            }}
          />
        ))}
      </View>
      <Button
        label={t("superset.close")}
        variant="ghost"
        size="sm"
        onPress={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  grow: { flex: 1 },
  picking: { gap: tokens.space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  small: { fontSize: tokens.type.bodySmall },
});
