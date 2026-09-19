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

      {cards.some((card) => card.fullWidth) ? (
        <>
          <View style={styles.cards}>
            {cards.filter((card) => !card.fullWidth).map((card) => (
              <View key={card.id} style={styles.equalCardWrapper}>
                <DashboardCard {...card} />
              </View>
            ))}
          </View>

          {cards.filter((card) => card.fullWidth).map((card) => (
            <View key={card.id} style={styles.fullWidth}>
              <DashboardCard {...card} />
            </View>
          ))}
        </>
      ) : (
        <View style={styles.cards}>
          {cards.map((card) => (
            <View key={card.id} style={styles.cardWrapper}>
              <DashboardCard {...card} />
            </View>
          ))}
        </View>
      )}
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
    flexWrap: "wrap",
    gap: 12,
  },
  cardWrapper: {
    width: "48%",
  },
  equalCardWrapper: {
    width: "24%",
  },
  fullWidth: {
    width: "100%",
  },
});
