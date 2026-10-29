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
  /** The partner is being chosen (opened from the More menu): the moves to pair it with are listed. */
  choosing: boolean;
  onLink: (exerciseId: string) => void;
  onClose: () => void;
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

/**
 * The move under way's superset (K-416): its partners in a line, and while a partner is being chosen (opened from the More
 * menu, ADR-070 Ek 2 #1: the header keeps one row of links) the moves of the session it can be paired with. The ways in and
 * out ("Superset with…", "Not a superset") are the menu's rows.
 */
export function SupersetLink({ partners, candidates, choosing, onLink, onClose }: Props) {
  const { color } = useTheme();
  if (partners.length > 0) {
    return (
      <Text style={[styles.small, styles.line, { color: color.accent }]}>
        {t("superset.with", {
          names: partners.join(t("superset.separator")),
        })}
      </Text>
    );
  }
  if (!choosing || candidates.length === 0) return null;
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
            onPress={() => onLink(c.id)}
          />
        ))}
      </View>
      <Button label={t("superset.close")} variant="text" size="sm" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexBasis: "100%" },
  picking: { gap: tokens.space.sm, flexBasis: "100%" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  small: { fontSize: tokens.type.bodySmall },
});
