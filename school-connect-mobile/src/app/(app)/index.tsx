import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { StudentDashboard } from "../../features/dashboard/dashboards/StudentDashboard";
import { useAuthStore } from "../../stores/authStore";

export default function AppHomeScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const renderDashboard = () => {
    switch (user?.role) {
      case "STUDENT":
        return (
          <StudentDashboard
            firstName={user.firstName}
          />
        );

      default:
        return <StudentDashboard firstName={user?.firstName ?? ""} />;
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

      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          void handleLogout();
        }}
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
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
    paddingTop: 12,
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
  logoutButton: {
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
