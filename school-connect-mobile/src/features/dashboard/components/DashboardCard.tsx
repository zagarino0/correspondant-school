import { Ionicons } from "@expo/vector-icons";
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
        onPress ? styles.interactive : null,
        pressed && onPress ? styles.cardPressed : null,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? title : undefined}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <View style={styles.accent} />
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        {onPress ? (
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
          </View>
        ) : badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {value ? <Text style={styles.value}>{value}</Text> : null}

      {description ? (
        <Text style={styles.description} numberOfLines={3}>{description}</Text>
      ) : null}

      {content ? <View style={styles.content}>{content}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 124,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  interactive: {
    borderColor: "#D9D6FE",
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#4F46E5",
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D92D20",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  value: {
    marginTop: 14,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    color: "#101828",
  },
  description: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  content: {
    marginTop: 14,
  },
});
