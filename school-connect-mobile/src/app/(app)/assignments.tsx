import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import type {
  AssignmentStatus,
  StudentAssignment,
  TeacherScheduleAssignment,
} from "../../features/assignments/assignment.types";
import { getMyAssignments, getTeacherAssignments } from "../../services/assignments/assignment.service";
import { getTeacherDashboard } from "../../services/teacher/teacher.service";
import type { TeacherDashboardResponse } from "../../features/dashboard/teacher-dashboard.types";
import { useAuthStore } from "../../stores/authStore";

const statusLabels: Record<AssignmentStatus, string> = {
  PENDING: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  LATE: "En retard",
  CANCELLED: "Annulé",
};

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "Sans date limite";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "Date limite indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.subject}>{assignment.subject}</Text>
          <Text style={styles.title}>{assignment.title}</Text>
        </View>
        <Text style={styles.status}>{statusLabels[assignment.status]}</Text>
      </View>
      {assignment.description ? <Text style={styles.description}>{assignment.description}</Text> : null}
      <Text style={styles.dueDate}>Date limite : {formatDueDate(assignment.dueDate)}</Text>
    </View>
  );
}

function getLocalDateKey(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function TeacherAssignmentsScreen() {
  const router = useRouter();
  const [date, setDate] = useState(getLocalDateKey);
  const [dashboard, setDashboard] = useState<TeacherDashboardResponse | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TeacherScheduleAssignment[]>([]);
  const [students, setStudents] = useState<Array<{ enrollmentId: string; student: { id: string; studentNumber: string; firstName: string; lastName: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [workLoading, setWorkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedules = dashboard?.today.schedules ?? [];
  const selectedSchedule = useMemo(
    () => schedules.find((item) => item.id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId],
  );

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeacherDashboard(date);
      setDashboard(response);
      setSelectedScheduleId((current) =>
        current && response.today.schedules.some((item) => item.id === current)
          ? current
          : response.today.schedules[0]?.id ?? null,
      );
    } catch {
      setDashboard(null);
      setSelectedScheduleId(null);
      setAssignments([]);
      setStudents([]);
      setError("Impossible de charger l'emploi du temps.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadAssignments = useCallback(async () => {
    if (!selectedScheduleId) {
      setAssignments([]);
      setStudents([]);
      return;
    }

    try {
      setWorkLoading(true);
      setError(null);
      const response = await getTeacherAssignments(selectedScheduleId);
      setAssignments(response.assignments);
      setStudents(response.students);
    } catch {
      setAssignments([]);
      setStudents([]);
      setError("Impossible de charger les devoirs de ce créneau.");
    } finally {
      setWorkLoading(false);
    }
  }, [selectedScheduleId]);

  useFocusEffect(useCallback(() => { void loadSchedule(); }, [loadSchedule]));
  useFocusEffect(useCallback(() => { void loadAssignments(); }, [loadAssignments]));

  if (loading) {
    return <View style={styles.stateContainer}><ActivityIndicator size="large" /><Text style={styles.stateText}>Chargement de l'emploi du temps…</Text></View>;
  }

  return (
    <View style={styles.teacherContainer}>
      <View style={styles.teacherHeader}>
        <Pressable onPress={() => router.replace("/(app)")}><Text style={styles.backButton}>‹</Text></Pressable>
        <View>
          <Text style={styles.headerTitle}>Devoirs & travaux</Text>
          <Text style={styles.subtitle}>Le contenu est filtré automatiquement par l'emploi du temps.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.datePanel}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.dateText}>{date}</Text>
          <Pressable onPress={() => setDate(getLocalDateKey())} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Aujourd'hui</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {schedules.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun cours prévu</Text>
            <Text style={styles.stateText}>Aucun créneau n'est disponible dans votre emploi du temps pour cette date.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Créneau</Text>
            <View style={styles.scheduleList}>
              {schedules.map((schedule) => {
                const schoolClass = dashboard?.classes.find((item) => item.id === schedule.classId);
                const active = schedule.id === selectedScheduleId;
                return (
                  <Pressable key={schedule.id} onPress={() => setSelectedScheduleId(schedule.id)} style={[styles.scheduleCard, active && styles.scheduleCardActive]}>
                    <Text style={[styles.scheduleClass, active && styles.scheduleTextActive]}>{schoolClass?.name ?? "Classe"}</Text>
                    <Text style={[styles.scheduleSubject, active && styles.scheduleTextActive]}>{schedule.subject}</Text>
                    <Text style={[styles.scheduleTime, active && styles.scheduleMutedActive]}>{schedule.startTime}–{schedule.endTime}{schedule.room ? ` · Salle ${schedule.room}` : ""}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.contextCard}>
              <Text style={styles.sectionTitle}>{dashboard?.classes.find((item) => item.id === selectedSchedule?.classId)?.name ?? "Classe"}</Text>
              <Text style={styles.contextText}>{selectedSchedule?.subject} · {selectedSchedule?.startTime}–{selectedSchedule?.endTime}</Text>
            </View>

            {workLoading ? (
              <View style={styles.stateCard}><ActivityIndicator /><Text style={styles.stateText}>Chargement des devoirs…</Text></View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Devoirs</Text>
                {assignments.length === 0 ? (
                  <View style={styles.stateCard}><Text style={styles.stateTitle}>Aucun devoir pour ce cours</Text><Text style={styles.stateText}>Aucun devoir n'est associé à cette classe et cette matière.</Text></View>
                ) : (
                  assignments.map((assignment) => (
                    <View key={assignment.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.subject}>{assignment.subject}</Text>
                          <Text style={styles.title}>{assignment.title}</Text>
                        </View>
                        <Text style={styles.status}>{assignment.status}</Text>
                      </View>
                      {assignment.description ? <Text style={styles.description}>{assignment.description}</Text> : null}
                      <Text style={styles.dueDate}>À rendre : {formatDueDate(assignment.dueDate)}</Text>
                    </View>
                  ))
                )}

                <Text style={styles.sectionTitle}>Travaux des élèves</Text>
                <View style={styles.workGrid}>
                  {students.map((row) => {
                    const personal = assignments.find((item) => item.studentId === row.student.id);
                    const classWork = assignments.find((item) => item.studentId === null);
                    const workStatus = personal?.status ?? (classWork ? "ASSIGNÉ" : "AUCUN DEVOIR");
                    return (
                      <View key={row.enrollmentId} style={styles.studentRow}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{row.student.firstName} {row.student.lastName}</Text>
                          <Text style={styles.studentNumber}>{row.student.studentNumber}</Text>
                        </View>
                        <Text style={styles.workStatus}>{workStatus}</Text>
                      </View>
                    );
                  })}
                  {students.length === 0 ? <Text style={styles.stateText}>Aucun élève actif dans cette classe.</Text> : null}
                </View>
                <Text style={styles.note}>
                  Le statut détaillé de remise par élève nécessite un enregistrement de travail/remise distinct. Le modèle actuel des devoirs stocke le statut au niveau du devoir.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StudentAssignmentsScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAssignments() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyAssignments();
        if (isMounted) setAssignments(response.assignments);
      } catch {
        if (isMounted) setErrorMessage("Impossible de charger vos devoirs.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadAssignments();
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(app)")}>
          <Text style={styles.backButton}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Devoirs</Text>
          <Text style={styles.subtitle}>Vos devoirs</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.stateContainer}><ActivityIndicator size="large" /><Text style={styles.stateText}>Chargement de vos devoirs…</Text></View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}><Text style={styles.errorText}>{errorMessage}</Text></View>
      ) : assignments.length === 0 ? (
        <View style={styles.stateContainer}><Text style={styles.stateTitle}>Aucun devoir</Text><Text style={styles.stateText}>Aucun devoir n'est actuellement disponible.</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
        </ScrollView>
      )}
    </View>
  );
}

export default function AssignmentsScreen() {
  const role = useAuthStore((state) => state.user?.role);
  return role === "TEACHER" ? <TeacherAssignmentsScreen /> : <StudentAssignmentsScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  teacherContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  teacherHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { fontSize: 36, lineHeight: 36, color: "#111827" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#6B7280", maxWidth: 310 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  datePanel: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  label: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  dateText: { marginTop: 6, fontSize: 16, fontWeight: "700", color: "#111827" },
  todayButton: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#111827" },
  todayButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  scheduleList: { gap: 10 },
  scheduleCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  scheduleCardActive: { backgroundColor: "#111827", borderColor: "#111827" },
  scheduleClass: { fontSize: 16, fontWeight: "700", color: "#111827" },
  scheduleSubject: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#374151" },
  scheduleTime: { marginTop: 5, fontSize: 12, color: "#6B7280" },
  scheduleTextActive: { color: "#FFFFFF" },
  scheduleMutedActive: { color: "#D1D5DB" },
  contextCard: { padding: 16, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  contextText: { marginTop: 4, color: "#6B7280", fontSize: 13 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardTitleContainer: { flex: 1 },
  subject: { fontSize: 12, fontWeight: "700", color: "#4B5563", textTransform: "uppercase" },
  title: { marginTop: 4, fontSize: 17, fontWeight: "700", color: "#111827" },
  status: { fontSize: 12, fontWeight: "600", color: "#374151", textAlign: "right" },
  description: { marginTop: 12, fontSize: 14, lineHeight: 20, color: "#4B5563" },
  dueDate: { marginTop: 12, fontSize: 13, fontWeight: "600", color: "#374151" },
  workGrid: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF" },
  studentRow: { minHeight: 64, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  studentNumber: { marginTop: 3, fontSize: 11, color: "#9CA3AF" },
  workStatus: { fontSize: 11, fontWeight: "700", color: "#374151" },
  note: { fontSize: 11, lineHeight: 16, color: "#9CA3AF" },
  stateContainer: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  stateCard: { padding: 20, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  stateTitle: { fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "center" },
  stateText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#6B7280", textAlign: "center" },
  errorText: { fontSize: 14, lineHeight: 20, color: "#B91C1C", textAlign: "center" },
});
