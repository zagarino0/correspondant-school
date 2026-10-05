import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { colors, spacing } from "../../../theme";
import type { DashboardSectionData } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";

type DashboardSectionProps = DashboardSectionData;

export function DashboardSection({ title, cards }: DashboardSectionProps) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(0, width - spacing.lg * 2);
  const isPhone = width < 600;
  const columns = width >= 960 ? 3 : width >= 600 ? 2 : 1;
  const gap = spacing.md;
  const cardWidth =
    columns === 1
      ? "100%"
      : (contentWidth - gap * (columns - 1)) / columns;

  const fullWidthCards = cards.filter((card) => card.fullWidth);
  const compactCards = cards.filter((card) => !card.fullWidth);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rule} />
      </View>

      <View style={[styles.grid, isPhone ? styles.phoneGrid : null]}>
        {compactCards.map((card) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              { width: cardWidth },
              isPhone ? styles.phoneCard : null,
            ]}
          >
            <DashboardCard {...card} />
          </View>
        ))}
      </View>

      {fullWidthCards.map((card) => (
        <View key={card.id} style={styles.fullWidth}>
          <DashboardCard {...card} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  phoneGrid: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  cardWrapper: {
    minWidth: 0,
  },
  phoneCard: {
    width: "100%",
  },
  fullWidth: {
    width: "100%",
    marginTop: spacing.md,
  },
});
