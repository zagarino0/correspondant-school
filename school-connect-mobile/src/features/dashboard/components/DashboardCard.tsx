import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../../theme";
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
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {onPress ? (
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        ) : badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {value ? <Text style={styles.value}>{value}</Text> : null}

      {description ? (
        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>
      ) : null}

      {content ? <View style={styles.content}>{content}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interactive: {
    borderColor: "#D9D6FE",
  },
  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.988 }],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  accent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  badge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  value: {
    marginTop: spacing.md,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  content: {
    marginTop: spacing.md,
  },
});
