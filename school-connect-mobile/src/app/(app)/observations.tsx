import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { getTeacherObservations } from "../../services/teacher/teacher-class.service";
import type { TeacherObservation } from "../../features/dashboard/teacher-classes.types";

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function TeacherObservationsScreen() {
  const router = useRouter();
  const [observations, setObservations] = useState<TeacherObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadObservations = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      const response = await getTeacherObservations();
      setObservations(response.observations);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadObservations();
    }, [loadObservations]),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Historique des observations</Text>
          <Text style={styles.subtitle}>
            Suivi des activités pédagogiques enregistrées par créneau et par classe.
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.muted}>Chargement de l'historique…</Text>
        </View>
      ) : hasError ? (
        <View style={styles.state}>
          <Text style={styles.error}>Impossible de charger l'historique.</Text>
          <Pressable onPress={() => void loadObservations()} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : observations.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.muted}>Aucune observation enregistrée.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.dateColumn]}>Date</Text>
            <Text style={[styles.headerCell, styles.classColumn]}>Classe</Text>
            <Text style={[styles.headerCell, styles.subjectColumn]}>Matière</Text>
            <Text style={[styles.headerCell, styles.slotColumn]}>Créneau</Text>
            <Text style={[styles.headerCell, styles.observationColumn]}>Observation</Text>
          </View>

          {observations.map((observation) => (
            <View key={observation.id} style={styles.row}>
              <Text style={[styles.cell, styles.dateColumn]}>
                {formatDate(observation.date)}
              </Text>
              <Text style={[styles.cellStrong, styles.classColumn]}>
                {observation.schedule.class.name}
              </Text>
              <Text style={[styles.cell, styles.subjectColumn]}>
                {observation.schedule.subject}
              </Text>
              <Text style={[styles.cell, styles.slotColumn]}>
                {observation.schedule.startTime} – {observation.schedule.endTime}
              </Text>
              <Text style={[styles.cell, styles.observationColumn]}>
                {observation.content}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  title: { fontSize: 25, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "#6B7280" },
  backButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: "#111827" },
  backButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  table: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#FFFFFF", overflow: "hidden" },
  tableHeader: { flexDirection: "row", alignItems: "center", minHeight: 42, paddingHorizontal: 12, backgroundColor: "#F1F5F9", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerCell: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  cell: { fontSize: 12, lineHeight: 17, color: "#374151", paddingRight: 8 },
  cellStrong: { fontSize: 12, lineHeight: 17, fontWeight: "700", color: "#111827", paddingRight: 8 },
  dateColumn: { width: 78 },
  classColumn: { width: 70 },
  subjectColumn: { width: 115 },
  slotColumn: { width: 105 },
  observationColumn: { flex: 1 },
  state: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { fontSize: 13, color: "#6B7280" },
  error: { fontSize: 13, color: "#B91C1C", textAlign: "center" },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: "#111827" },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
