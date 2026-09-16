import { Pressable, StyleSheet, Text } from "react-native";

import type { DashboardCardData } from "../dashboard.types";

type DashboardCardProps = DashboardCardData;

export function DashboardCard({
  title,
  value,
  description,
  onPress,
}: DashboardCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.cardPressed : null,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? title : undefined}
    >
      <Text style={styles.title}>{title}</Text>

      {value ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </Pressable>
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
  cardPressed: {
    opacity: 0.7,
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
