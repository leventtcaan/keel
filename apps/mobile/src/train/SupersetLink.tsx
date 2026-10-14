import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

/**
 * The move under way's superset (K-416): its partners and a way out, or a way in with a move of the session. Small links
 * beside the move's other links (K-971: the set under way stays in the first view); picking opens the moves under them.
 */
export function SupersetLink({
  partners,
  candidates,
  onLink,
  onUnlink,
}: Props) {
  const { color } = useTheme();
  const [picking, setPicking] = useState(false);
  const link = (label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.link}
    >
      <Text style={[styles.small, { color: color.accent }]}>{label}</Text>
    </Pressable>
  );
  if (partners.length > 0) {
    // The partners across a line of their own, then the way out as one more link among the move's: never one row holding
    // both, which squeezed the links after it (Skip move) into letters stacked on end (K-1013, 10 Oct walkthrough).
    return (
      <>
        <Text style={[styles.small, styles.line, { color: color.accent }]}>
          {t("superset.with", {
            names: partners.join(t("superset.separator")),
          })}
        </Text>
        {link(t("superset.unlink"), onUnlink)}
      </>
    );
  }
  if (candidates.length === 0) return null;
  if (!picking) return link(t("superset.link"), () => setPicking(true));
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
      {link(t("superset.close"), () => setPicking(false))}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: tokens.size.touch, justifyContent: "center" },
  // Under the links it sits beside, across the whole line.
  line: { flexBasis: "100%" },
  picking: { gap: tokens.space.sm, flexBasis: "100%" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  small: { fontSize: tokens.type.bodySmall },
});
