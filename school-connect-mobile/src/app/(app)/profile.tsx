import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "../../stores/authStore";

export default function ProfileScreen() {
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
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Profil
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0) ?? ""}
            {user?.lastName?.charAt(0) ?? ""}
          </Text>
        </View>

        <Text style={styles.name}>
          {user?.firstName ?? ""} {user?.lastName ?? ""}
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            label="Prénom"
            value={user?.firstName ?? "—"}
          />

          <InfoRow
            label="Nom"
            value={user?.lastName ?? "—"}
          />

          <InfoRow
            label="Email"
            value={user?.email ?? "—"}
          />

          <InfoRow
            label="Rôle"
            value={user?.role ?? "—"}
          />

          <InfoRow
            label="École"
            value={user?.schoolId ?? "—"}
          />
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
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  headerSpacer: {
    width: 44,
  },

  content: {
    flex: 1,
    padding: 16,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#374151",
  },

  name: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  infoCard: {
    marginTop: 28,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },

  infoRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  infoValue: {
    marginTop: 4,
    fontSize: 16,
    color: "#111827",
  },

  logoutButton: {
    marginTop: 24,
    paddingVertical: 14,
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