import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { DashboardSectionData } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";

type DashboardSectionProps = DashboardSectionData;

export function DashboardSection({ title, cards }: DashboardSectionProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 600;
  const fullWidthCards = cards.filter((card) => card.fullWidth);
  const compactCards = cards.filter((card) => !card.fullWidth);
  const firstRowCards = compactCards.slice(0, 2);
  const secondRowCards = compactCards.slice(2);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.dot} />
      </View>

      {cards.some((card) => card.fullWidth) ? (
        <>
          <View style={[styles.row, isPhone ? styles.phoneColumn : null]}>
            {firstRowCards.map((card) => (
              <View key={card.id} style={[styles.halfCardWrapper, isPhone ? styles.phoneCardWrapper : null]}>
                <DashboardCard {...card} />
              </View>
            ))}
          </View>
          {secondRowCards.length > 0 ? (
            <View style={[styles.row, isPhone ? styles.phoneColumn : null]}>
              {secondRowCards.map((card) => (
                <View key={card.id} style={[styles.halfCardWrapper, isPhone ? styles.phoneCardWrapper : null]}>
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
        <View style={[styles.row, isPhone ? styles.phoneColumn : null]}>
          {cards.map((card) => (
            <View key={card.id} style={[styles.halfCardWrapper, isPhone ? styles.phoneCardWrapper : null]}>
              <DashboardCard {...card} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 11,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#101828" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4F46E5" },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  phoneColumn: { flexDirection: "column" },
  halfCardWrapper: { flex: 1, minWidth: 0 },
  phoneCardWrapper: { width: "100%", flex: 0 },
  fullWidth: { width: "100%" },
});
