import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

export default function MessagesScreen() {
  const router = useRouter();

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
          Messages
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉</Text>
        </View>

        <Text style={styles.title}>
          Messages
        </Text>

        <Text style={styles.subtitle}>
          Votre messagerie sera disponible ici.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Messagerie
          </Text>

          <Text style={styles.infoText}>
            Vous pourrez consulter vos conversations,
            envoyer des messages et échanger avec les
            membres autorisés de votre établissement.
          </Text>
        </View>
      </View>
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
    paddingTop: 24,
    paddingBottom: 20,
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
    padding: 24,
    alignItems: "center",
  },

  iconContainer: {
    width: 72,
    height: 72,
    marginTop: 40,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  icon: {
    fontSize: 30,
    color: "#374151",
  },

  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 15,
    color: "#6B7280",
  },

  infoCard: {
    width: "100%",
    marginTop: 28,
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  infoText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
});