import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { ParentDashboard } from "../../features/dashboard/dashboards/ParentDashboard";
import { SchoolAdminDashboard } from "../../features/dashboard/dashboards/SchoolAdminDashboard";
import { StaffDashboard } from "../../features/dashboard/dashboards/StaffDashboard";
import { StudentDashboard } from "../../features/dashboard/dashboards/StudentDashboard";
import { SuperAdminDashboard } from "../../features/dashboard/dashboards/SuperAdminDashboard";
import { TeacherDashboard } from "../../features/dashboard/dashboards/TeacherDashboard";
import { useAuthStore } from "../../stores/authStore";

export default function AppHomeScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);

  const renderDashboard = () => {
    if (!user) {
      return null;
    }

    switch (user.role) {
      case "STUDENT":
        return <StudentDashboard firstName={user.firstName} />;
      case "PARENT":
        return <ParentDashboard firstName={user.firstName} />;
      case "TEACHER":
        return <TeacherDashboard firstName={user.firstName} />;
      case "STAFF":
        return <StaffDashboard firstName={user.firstName} />;
      case "SCHOOL_ADMIN":
        return <SchoolAdminDashboard firstName={user.firstName} />;
      case "SUPER_ADMIN":
        return <SuperAdminDashboard firstName={user.firstName} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <DashboardHeader
        firstName={user?.firstName ?? ""}
        role={user?.role ?? "STUDENT"}
      />

      {renderDashboard()}

      <View style={styles.bottomNavigation}>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>Accueil</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push("/(app)/messages")}
          accessibilityRole="button"
          accessibilityLabel="Messages"
        >
          <Text style={styles.navIcon}>✉</Text>
          <Text style={styles.navLabel}>Messages</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push("/(app)/assistant")}
          accessibilityRole="button"
          accessibilityLabel="Assistant"
        >
          <Text style={styles.navIcon}>✦</Text>
          <Text style={styles.navLabel}>Assistant</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push("/(app)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Profil"
        >
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navLabel}>Profil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  bottomNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    gap: 4,
  },
  navIcon: {
    fontSize: 20,
    color: "#374151",
  },
  navLabel: {
    fontSize: 12,
    color: "#374151",
  },
});
