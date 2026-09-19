import { StyleSheet, Text, View } from "react-native";

import type { DashboardSectionData } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";

type DashboardSectionProps = DashboardSectionData;

export function DashboardSection({
  title,
  cards,
}: DashboardSectionProps) {
  const fullWidthCards = cards.filter((card) => card.fullWidth);
  const compactCards = cards.filter((card) => !card.fullWidth);
  const firstRowCards = compactCards.slice(0, 2);
  const secondRowCards = compactCards.slice(2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {cards.some((card) => card.fullWidth) ? (
        <>
          <View style={styles.row}>
            {firstRowCards.map((card) => (
              <View key={card.id} style={styles.halfCardWrapper}>
                <DashboardCard {...card} />
              </View>
            ))}
          </View>

          {secondRowCards.length > 0 ? (
            <View style={styles.row}>
              {secondRowCards.map((card) => (
                <View key={card.id} style={styles.halfCardWrapper}>
                  <DashboardCard {...card} />
                </View>
              ))}
            </View>
          ) : null}

          {fullWidthCards.map((card) => (
            <View key={card.id} style={styles.fullWidth}>
              <DashboardCard {...card} />
            </View>
          ))}
        </>
      ) : (
        <View style={styles.row}>
          {cards.map((card) => (
            <View key={card.id} style={styles.halfCardWrapper}>
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
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfCardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  fullWidth: {
    width: "100%",
  },
});
