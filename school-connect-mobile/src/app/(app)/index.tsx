import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "../../stores/authStore";

export default function AppHomeScreen() {
  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user,
  );

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            School Connect
          </Text>

          <Text style={styles.greeting}>
            Bonjour {user?.firstName ?? ""}
          </Text>
        </View>

        <Pressable
          style={styles.notificationButton}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Text style={styles.notificationIcon}>
            🔔
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Tableau de bord
        </Text>

        <Text style={styles.subtitle}>
          {user?.role ?? ""}
        </Text>
      </View>

      <View style={styles.bottomNavigation}>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>
            Accueil
          </Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>✉</Text>
          <Text style={styles.navLabel}>
            Messages
          </Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>✦</Text>
          <Text style={styles.navLabel}>
            Assistant
          </Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navLabel}>
            Profil
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          void handleLogout();
        }}
      >
        <Text style={styles.logoutText}>
          Se déconnecter
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
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

  content: {
    flex: 1,
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
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