import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getSchoolTeachers } from "../../../services/teachers/teacher.service";
import type { SchoolTeacher, TeacherClassSummary } from "../../../services/teachers/teacher.types";

export default function TeacherClassesScreen() {
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{ enrollmentId: string; student: { firstName: string; lastName: string; studentNumber: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSchoolTeachers();
      const map = new Map<string, TeacherClassSummary>();
      for (const teacher of response.teachers) {
        for (const schoolClass of teacher.classes) {
          if (!map.has(schoolClass.id)) map.set(schoolClass.id, schoolClass);
        }
      }
      setClasses(Array.from(map.values()));
      setSelectedClassId((current) =>
        current && response.classes.some((item) => item.id === current)
          ? current
          : response.classes[0]?.id ?? null,
      );
    } catch {
      setError("Impossible de charger vos classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }
    try {
      setDetailLoading(true);
      setStudents([]);
    } catch {
      setError("Impossible de charger les élèves de cette classe.");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedClassId]);

  useFocusEffect(useCallback(() => { void loadClasses(); }, [loadClasses]));
  useFocusEffect(useCallback(() => { void loadStudents(); }, [loadStudents]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Chargement de vos classes…</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mes classes</Text>
      <Text style={styles.subtitle}>Toutes les classes qui vous sont affectées par l'établissement.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.sectionTitle}>Aucune classe affectée</Text>
          <Text style={styles.muted}>Votre compte enseignant n'a encore aucune classe affectée.</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Classes affectées</Text><Text style={styles.sectionMeta}>{classes.length} classe{classes.length > 1 ? "s" : ""} au total</Text></View>
            <View style={styles.countBadge}><Text style={styles.countBadgeText}>{classes.length}</Text></View>
          </View>

          <View style={styles.classGrid}>
            {classes.map((item) => (
              <Pressable key={item.id} onPress={() => setSelectedClassId(item.id)} style={[styles.classCard, item.id === selectedClassId && styles.classCardActive]}>
                <Text style={[styles.className, item.id === selectedClassId && styles.classNameActive]}>{item.name}</Text>
                <Text style={[styles.classLevel, item.id === selectedClassId && styles.classLevelActive]}>{item.level ?? "Niveau non renseigné"}</Text>
                <Text style={[styles.classStudents, item.id === selectedClassId && styles.classStudentsActive]}>{item.studentCount} élève{item.studentCount > 1 ? "s" : ""}</Text>
              </Pressable>
            ))}
          </View>

          {selectedClass ? (
            <View style={styles.panel}>
              <View style={styles.sectionHeader}>
                <View style={styles.flex}>
                  <Text style={styles.panelTitle}>Élèves — {selectedClass.name}</Text>
                  <Text style={styles.panelHint}>{selectedClass.academicYear.name}</Text>
                </View>
                <View style={styles.countBadge}><Text style={styles.countBadgeText}>{students.length}</Text></View>
              </View>

              {detailLoading ? <View style={styles.loader}><ActivityIndicator /></View> : students.length === 0 ? (
                <Text style={styles.muted}>Aucun élève actif dans cette classe.</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}><Text style={[styles.cell, styles.nameCell]}>Élève</Text><Text style={[styles.cell, styles.numberCell]}>N°</Text></View>
                  {students.map((item, index) => (
                    <View key={item.enrollmentId} style={styles.tableRow}>
                      <Text style={[styles.studentName, styles.nameCell]}>{index + 1}. {item.student.firstName} {item.student.lastName}</Text>
                      <Text style={[styles.cell, styles.numberCell]}>{item.student.studentNumber}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { color: "#6B7280", lineHeight: 21 },
  error: { color: "#B91C1C", fontSize: 13 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionMeta: { marginTop: 4, color: "#6B7280", fontSize: 13 },
  countBadge: { minWidth: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#E5E7EB" },
  countBadgeText: { fontWeight: "700", color: "#111827" },
  classGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  classCard: { width: "48%", minHeight: 126, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  classCardActive: { backgroundColor: "#111827", borderColor: "#111827" },
  className: { fontSize: 16, fontWeight: "700", color: "#111827" },
  classNameActive: { color: "#FFFFFF" },
  classLevel: { marginTop: 7, color: "#6B7280", fontSize: 12 },
  classLevelActive: { color: "#D1D5DB" },
  classStudents: { marginTop: 12, color: "#374151", fontSize: 13 },
  classStudentsActive: { color: "#FFFFFF" },
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 12 },
  panelTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  panelHint: { marginTop: 4, color: "#6B7280", fontSize: 13 },
  flex: { flex: 1 },
  loader: { paddingVertical: 18, alignItems: "center" },
  table: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  tableHeader: { flexDirection: "row", padding: 12, backgroundColor: "#F1F5F9" },
  tableRow: { flexDirection: "row", alignItems: "center", minHeight: 54, padding: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  cell: { fontSize: 12, color: "#6B7280" },
  nameCell: { flex: 1 },
  numberCell: { width: 90 },
  studentName: { color: "#111827", fontWeight: "600" },
  empty: { padding: 20, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  muted: { color: "#6B7280", fontSize: 13 },
});
