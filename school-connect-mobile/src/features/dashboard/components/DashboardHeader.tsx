import { StyleSheet, Text, View } from "react-native";

import type { UserRole } from "../../../types/auth";

type DashboardHeaderProps = {
  firstName: string;
  role: UserRole;
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  SCHOOL_ADMIN: "Administrateur scolaire",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Élève",
  STAFF: "Personnel",
};

export function DashboardHeader({
  firstName,
  role,
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.brand}>School Connect</Text>
        <Text style={styles.greeting} numberOfLines={1}>
          Bonjour {firstName}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {roleLabels[role]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  textContainer: {
    minWidth: 0,
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
});
