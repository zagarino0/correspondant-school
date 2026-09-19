import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DashboardCardData } from "../dashboard.types";

type DashboardCardProps = DashboardCardData;

export function DashboardCard({
  title,
  value,
  badge,
  description,
  onPress,
  content,
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
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>

        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {value ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      {content ? <View style={styles.content}>{content}</View> : null}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
  content: {
    marginTop: 14,
  },
});
