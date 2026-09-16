import { StyleSheet, Text, View } from "react-native";

import type { DashboardCardData } from "../dashboard.types";

type DashboardCardProps = DashboardCardData;

export function DashboardCard({
  title,
  value,
  description,
}: DashboardCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {value ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  value: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
  },
});
