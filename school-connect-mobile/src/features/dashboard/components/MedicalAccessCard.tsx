import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getMedicalAccess } from "../../../services/medical/medical.service";

export function MedicalAccessCard() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"FULL" | "PARENT" | null>(null);

  useEffect(() => {
    let mounted = true;
    void getMedicalAccess()
      .then((access) => {
        if (!mounted) return;
        setAllowed(access.allowed);
        setMode(access.mode);
      })
      .catch(() => {
        if (mounted) setAllowed(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (allowed === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#344976" />
      </View>
    );
  }

  if (!allowed) return null;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push("/(app)/medical")}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir les fiches médicales"
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>+</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Fiches médicales</Text>
        <Text style={styles.description}>
          {mode === "PARENT"
            ? "Consulter la fiche médicale de votre enfant."
            : "Consulter et gérer les dossiers médicaux autorisés."}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    minHeight: 8,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    minHeight: 82,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E1EE",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
  },
  iconText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#344976",
  },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: "900", color: "#111827" },
  description: { marginTop: 4, fontSize: 12, lineHeight: 17, color: "#64748B" },
  arrow: { fontSize: 26, color: "#344976" },
});
