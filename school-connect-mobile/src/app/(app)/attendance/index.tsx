import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getTeacherDashboard } from "../../../services/teacher/teacher.service";
import { getTeacherAttendance, getTeacherClass, saveTeacherAttendance } from "../../../services/teacher/teacher-class.service";
import type { TeacherAttendanceRow } from "../../../features/dashboard/teacher-classes.types";
import type { TeacherDashboardResponse } from "../../../features/dashboard/teacher-dashboard.types";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

function getLocalDateKey(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export default function TeacherAttendanceScreen() {
  const [date, setDate] = useState(getLocalDateKey);
  const [dashboard, setDashboard] = useState<TeacherDashboardResponse | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingEnrollmentId, setSavingEnrollmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scheduledClasses = useMemo(() => {
    if (!dashboard) return [];
    const seen = new Set<string>();
    return dashboard.today.schedules
      .filter((schedule) => {
        if (seen.has(schedule.classId)) return false;
        seen.add(schedule.classId);
        return true;
      })
      .map((schedule) => {
        const schoolClass = dashboard.classes.find((item) => item.id === schedule.classId);
        return { id: schedule.classId, name: schoolClass?.name ?? "Classe", level: schoolClass?.level ?? null };
      });
  }, [dashboard]);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeacherDashboard(date);
      setDashboard(response);
      setSelectedClassId((current) =>
        current && response.today.schedules.some((item) => item.classId === current)
          ? current
          : response.today.schedules[0]?.classId ?? null,
      );
    } catch {
      setDashboard(null);
      setSelectedClassId(null);
      setStudents([]);
      setError("Impossible de charger l'emploi du temps du jour.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }
    try {
      setStudentsLoading(true);
      setError(null);
      const [details, attendance] = await Promise.all([
        getTeacherClass(selectedClassId),
        getTeacherAttendance(selectedClassId, date),
      ]);
      const attendanceByEnrollment = new Map(attendance.students.map((row) => [row.enrollmentId, row]));
      setStudents(details.students.map((student) =>
        attendanceByEnrollment.get(student.enrollmentId) ?? {
          enrollmentId: student.enrollmentId,
          student: student.student,
          attendance: null,
        },
      ));
    } catch {
      setStudents([]);
      setError("Impossible de charger les élèves de cette classe.");
    } finally {
      setStudentsLoading(false);
    }
  }, [date, selectedClassId]);

  useFocusEffect(useCallback(() => { void loadSchedule(); }, [loadSchedule]));
  useFocusEffect(useCallback(() => { void loadStudents(); }, [loadStudents]));

  async function handleAttendance(row: TeacherAttendanceRow, status: AttendanceStatus) {
    if (!selectedClassId) return;
    try {
      setSavingEnrollmentId(row.enrollmentId);
      const response = await saveTeacherAttendance(selectedClassId, { enrollmentId: row.enrollmentId, date, status });
      const saved = response.attendance;
      setStudents((current) => current.map((item) =>
        item.enrollmentId === row.enrollmentId
          ? {
              ...item,
              attendance: {
                id: saved.id,
                date: saved.date,
                status: saved.status,
                arrivalTime: saved.arrivalTime ?? null,
                reason: saved.reason ?? null,
                note: saved.note ?? null,
                recordedBy: saved.recordedBy,
              },
            }
          : item,
      ));
    } catch {
      setError("La présence n'a pas pu être enregistrée.");
    } finally {
      setSavingEnrollmentId(null);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Chargement de l'emploi du temps…</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Présences</Text>
      <Text style={styles.subtitle}>Les classes proposées correspondent aux cours prévus dans votre emploi du temps pour la date sélectionnée.</Text>

      <View style={styles.datePanel}>
        <Text style={styles.label}>Date</Text>
        <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" style={styles.dateInput} autoCapitalize="none" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {scheduledClasses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.sectionTitle}>Aucun cours prévu</Text>
          <Text style={styles.muted}>Aucune classe ne figure dans votre emploi du temps pour le {date}.</Text>
        </View>
      ) : (
        <>
          <View style={styles.classList}>
            {scheduledClasses.map((item) => (
              <Pressable key={item.id} onPress={() => setSelectedClassId(item.id)} style={[styles.classChip, item.id === selectedClassId && styles.classChipActive]}>
                <Text style={[styles.className, item.id === selectedClassId && styles.classNameActive]}>{item.name}</Text>
                {item.level ? <Text style={[styles.classLevel, item.id === selectedClassId && styles.classLevelActive]}>{item.level}</Text> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{scheduledClasses.find((item) => item.id === selectedClassId)?.name ?? "Classe"}</Text>
            <Text style={styles.muted}>Marquez le statut de chaque élève avec un bouton.</Text>

            {studentsLoading ? <View style={styles.loader}><ActivityIndicator /></View> : (
              <View style={styles.grid}>
                <View style={styles.gridHeader}>
                  <Text style={[styles.headerText, styles.studentColumn]}>Élève</Text>
                  <Text style={styles.statusHeader}>Présent</Text>
                  <Text style={styles.statusHeader}>Absent</Text>
                  <Text style={styles.statusHeader}>Retard</Text>
                </View>

                {students.map((row) => {
                  const current = row.attendance?.status;
                  const isSaving = savingEnrollmentId === row.enrollmentId;
                  return (
                    <View key={row.enrollmentId} style={styles.row}>
                      <View style={styles.studentColumn}>
                        <Text style={styles.studentName}>{row.student.firstName} {row.student.lastName}</Text>
                        <Text style={styles.studentNumber}>{row.student.studentNumber}</Text>
                      </View>
                      {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => (
                        <Pressable key={status} disabled={isSaving} onPress={() => void handleAttendance(row, status)} style={[styles.statusButton, current === status && styles.statusButtonActive, isSaving && styles.disabled]}>
                          <Text style={[styles.statusText, current === status && styles.statusTextActive]}>
                            {status === "PRESENT" ? "✓" : status === "ABSENT" ? "A" : "R"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })}

                {students.length === 0 ? <Text style={styles.muted}>Aucun élève actif dans cette classe.</Text> : null}
              </View>
            )}
          </View>
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
  datePanel: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151" },
  dateInput: { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", color: "#111827" },
  error: { color: "#B91C1C", fontSize: 13 },
  classList: { gap: 10 },
  classChip: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  classChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  className: { fontWeight: "700", color: "#111827" },
  classNameActive: { color: "#FFFFFF" },
  classLevel: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  classLevelActive: { color: "#D1D5DB" },
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  grid: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  gridHeader: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingHorizontal: 8, backgroundColor: "#F1F5F9" },
  headerText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  studentColumn: { flex: 1 },
  statusHeader: { width: 52, textAlign: "center", fontSize: 9, color: "#6B7280" },
  row: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  studentName: { color: "#111827", fontWeight: "600", fontSize: 13 },
  studentNumber: { marginTop: 3, color: "#9CA3AF", fontSize: 11 },
  statusButton: { width: 44, height: 38, marginLeft: 5, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" },
  statusButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  statusText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  statusTextActive: { color: "#FFFFFF" },
  disabled: { opacity: 0.45 },
  loader: { paddingVertical: 20, alignItems: "center" },
  empty: { padding: 20, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 8 },
  muted: { color: "#6B7280", fontSize: 13, lineHeight: 18 },
});
