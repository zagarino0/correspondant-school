import { StyleSheet, Text, View } from "react-native";

import type { DashboardSectionData } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";

type DashboardSectionProps = DashboardSectionData;

export function DashboardSection({
  title,
  cards,
}: DashboardSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.cards}>
        {cards.map((card) => (
          <DashboardCard key={card.id} {...card} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cards: {
    flexDirection: "row",
    gap: 12,
  },
});
