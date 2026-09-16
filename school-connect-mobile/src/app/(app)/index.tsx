import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { DashboardSection } from "../../features/dashboard/components/DashboardSection";
import type { DashboardSectionData } from "../../features/dashboard/dashboard.types";
import { useAuthStore } from "../../stores/authStore";

export default function AppHomeScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const shellSection: DashboardSectionData = {
    id: "overview",
    title: "Vue d’ensemble",
    cards: [
      {
        id: "account",
        title: "Compte",
        value: "Actif",
        description: "Votre espace personnel est prêt.",
      },
      {
        id: "access",
        title: "Accès",
        value: user?.role ?? "-",
        description: "Les modules seront adaptés à votre rôle.",
      },
    ],
  };

  return (
    <View style={styles.container}>
      <DashboardHeader
        firstName={user?.firstName ?? ""}
        role={user?.role ?? "STUDENT"}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Tableau de bord</Text>
        <Text style={styles.subtitle}>
          Votre espace School Connect
        </Text>

        <DashboardSection {...shellSection} />
      </ScrollView>

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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 24,
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
