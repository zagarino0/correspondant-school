import { Pressable, StyleSheet, Text, View } from "react-native";

import type { UserRole } from "../../../types/auth";

type DashboardHeaderProps = {
  firstName: string;
  role: UserRole;
};

export function DashboardHeader({
  firstName,
  role,
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.brand}>School Connect</Text>
        <Text style={styles.greeting}>
          Bonjour {firstName}
        </Text>
        <Text style={styles.role}>{role}</Text>
      </View>

      <Pressable
        style={styles.notificationButton}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Text style={styles.notificationIcon}>🔔</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  greeting: {
    marginTop: 4,
    fontSize: 15,
    color: "#6B7280",
  },
  role: {
    marginTop: 2,
    fontSize: 12,
    color: "#9CA3AF",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  notificationIcon: {
    fontSize: 20,
  },
});
