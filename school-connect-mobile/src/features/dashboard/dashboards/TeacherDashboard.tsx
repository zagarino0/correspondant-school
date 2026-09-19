import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getTeacherDashboard } from "../../../services/teacher/teacher.service";
import {
  getTeacherAttendance,
  getTeacherClasses,
  saveTeacherAttendance,
} from "../../../services/teacher/teacher-class.service";
import { getMyTeacherSchedule } from "../../../services/schedule/schedule.service";
import type { TeacherDashboardResponse } from "../teacher-dashboard.types";
import type {
  TeacherAttendanceRow,
  TeacherClass,
} from "../teacher-classes.types";
import type { TeacherSchedule } from "../../schedule/schedule.types";

function getLocalDateKey(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const dayLabels: Record<TeacherDashboardResponse["today"]["dayOfWeek"], string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

type TeacherDashboardProps = { firstName: string };

type ActivityClass = {
  schedule: TeacherSchedule;
  students: TeacherAttendanceRow[];
};

const attendanceLabels = {
  ABSENT: "A",
  PRESENT: "P",
  LATE: "R",
} as const;

export function TeacherDashboard({ firstName }: TeacherDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<TeacherDashboardResponse | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [activityClasses, setActivityClasses] = useState<ActivityClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      const [response, classResponse] = await Promise.all([
        getTeacherDashboard(getLocalDateKey()),
        getTeacherClasses(),
      ]);
      setDashboard(response);
      setClasses(classResponse.classes);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError(false);

      const [dashboardResponse, scheduleResponse] = await Promise.all([
        getTeacherDashboard(getLocalDateKey()),
        getMyTeacherSchedule(),
      ]);

      const todayScheduleIds = new Set(
        dashboardResponse.today.schedules.map((item) => item.id),
      );

      const todaySchedules = scheduleResponse.schedules.filter((item) =>
        todayScheduleIds.has(item.id),
      );

      const activities = await Promise.all(
        todaySchedules.map(async (schedule) => {
          const response = await getTeacherAttendance(
            schedule.classId,
            dashboardResponse.date,
          );
          return { schedule, students: response.students };
        }),
      );

      setActivityClasses(activities);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
      void loadActivity();
    }, [loadActivity, loadDashboard]),
  );

  const classesCount = classes.length;
  const scheduleCount = dashboard?.today.scheduleCount ?? null;
  const pendingAssignments = dashboard?.assignments.pendingCount ?? null;
  const studentsToRecord = dashboard?.attendance.studentsToRecordCount ?? null;
  const nextCourse = dashboard?.today.schedules[0] ?? null;

  const handleAttendance = useCallback(
    async (
      activity: ActivityClass,
      student: TeacherAttendanceRow,
      status: "PRESENT" | "ABSENT" | "LATE",
    ) => {
      try {
        setSavingAttendance(student.enrollmentId);
        const date = dashboard?.date ?? getLocalDateKey();

        await saveTeacherAttendance(activity.schedule.classId, {
          enrollmentId: student.enrollmentId,
          date,
          status,
        });

        setActivityClasses((current) =>
          current.map((item) => {
            if (item.schedule.id !== activity.schedule.id) return item;

            return {
              ...item,
              students: item.students.map((row) =>
                row.enrollmentId === student.enrollmentId
                  ? {
                      ...row,
                      attendance: row.attendance
                        ? { ...row.attendance, status }
                        : {
                            id: "",
                            date,
                            status,
                            arrivalTime: null,
                            reason: null,
                            note: null,
                            recordedBy: "",
                          },
                    }
                  : row,
              ),
            };
          }),
        );
      } catch {
        // The existing dashboard error state remains unchanged; the next focus refreshes data.
      } finally {
        setSavingAttendance(null);
      }
    },
    [dashboard?.date],
  );

  const sections: DashboardSectionData[] = [
    {
      id: "teacher-overview-stats",
      title: "Indicateurs",
      cards: [
        {
          id: "today",
          title: "Cours aujourd'hui",
          value: loading ? "…" : hasError ? "—" : String(scheduleCount ?? 0),
          description: loading
            ? "Chargement de votre emploi du temps."
            : hasError
              ? "Impossible de charger l'emploi du temps."
              : nextCourse
                ? nextCourse.startTime + " · " + nextCourse.subject
                : "Aucun cours prévu aujourd'hui.",
          onPress: () => router.push("/(app)/schedule"),
        },
        {
          id: "assignments",
          title: "Devoirs à suivre",
          value: loading ? "…" : hasError ? "—" : String(pendingAssignments ?? 0),
          description: loading
            ? "Chargement des devoirs."
            : hasError
              ? "Impossible de charger les devoirs."
              : "Devoirs en attente ou en retard.",
          onPress: () => router.push("/(app)/assignments"),
        },
        {
          id: "attendance",
          title: "Présences à enregistrer",
          value: loading ? "…" : hasError ? "—" : String(studentsToRecord ?? 0),
          description: loading
            ? "Chargement des présences."
            : hasError
              ? "Impossible de charger les présences."
              : studentsToRecord === 0
                ? "Toutes les présences du jour sont enregistrées."
                : "Élèves sans présence enregistrée aujourd'hui.",
          onPress: () => router.push("./attendance"),
        },
      ],
    },
    {
      id: "teacher-communication",
      title: "Communication",
      cards: [
        {
          id: "announcements",
          title: "Annonces",
          description: "Consulter les informations scolaires.",
          onPress: () => router.push("/(app)/announcements"),
        },
        {
          id: "messages",
          title: "Messages",
          description: "Échanger avec les parents et l'établissement.",
          onPress: () => router.push("/(app)/messages"),
        },
      ],
    },
  ];

  const activityEmptyText = useMemo(() => {
    if (activityLoading) return "Chargement de vos classes selon l'emploi du temps…";
    if (activityError) return "Impossible de charger l'activité pédagogique.";
    return "Aucun cours prévu aujourd'hui.";
  }, [activityError, activityLoading]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Espace enseignant</Text>
      <Text style={styles.subtitle}>
        Bonjour {firstName}, voici votre activité pédagogique.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.overviewCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Mes classes</Text>
              <Text style={styles.cardDescription}>
                Uniquement les classes qui vous sont affectées par l'établissement.
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{classesCount}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator />
          ) : classes.length === 0 ? (
            <Text style={styles.muted}>Aucune classe affectée.</Text>
          ) : (
            <View style={styles.classGrid}>
              {classes.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.classItem}
                  onPress={() => router.push("./classes")}
                >
                  <Text style={styles.className}>{item.name}</Text>
                  <Text style={styles.classLevel}>
                    {item.level ?? "Niveau non renseigné"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {sections.map((section) => (
        <DashboardSection key={section.id} {...section} />
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité pédagogique</Text>
        <View style={styles.activityCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Classes synchronisées avec l'emploi du temps</Text>
              <Text style={styles.cardDescription}>
                La classe et la matière viennent automatiquement de vos cours du jour.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/schedule")}
              style={styles.scheduleButton}
            >
              <Text style={styles.scheduleButtonText}>Planning</Text>
            </Pressable>
          </View>

          {activityLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator />
              <Text style={styles.muted}>Synchronisation avec l'emploi du temps…</Text>
            </View>
          ) : activityClasses.length === 0 ? (
            <Text style={styles.muted}>{activityEmptyText}</Text>
          ) : (
            <View style={styles.activityList}>
              {activityClasses.map((activity) => (
                <View key={activity.schedule.id} style={styles.activityClass}>
                  <View style={styles.activityHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.activityClassName}>
                        {activity.schedule.class.name} — {activity.schedule.subject}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {activity.schedule.startTime} – {activity.schedule.endTime}
                        {activity.schedule.room
                          ? " · Salle " + activity.schedule.room
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.scheduleBadge}>
                      <Text style={styles.scheduleBadgeText}>
                        {dayLabels[activity.schedule.dayOfWeek]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentHeader}>
                    <Text style={[styles.studentHeaderText, styles.studentNameColumn]}>
                      Élève
                    </Text>
                    <Text style={[styles.studentHeaderText, styles.studentNumberColumn]}>
                      N°
                    </Text>
                    <Text style={[styles.studentHeaderText, styles.attendanceColumn]}>
                      A / P / R
                    </Text>
                  </View>

                  {activity.students.map((student) => {
                    const currentStatus = student.attendance?.status ?? null;
                    const isSaving = savingAttendance === student.enrollmentId;

                    return (
                      <View key={student.enrollmentId} style={styles.studentRow}>
                        <Text style={[styles.studentNameText, styles.studentNameColumn]}>
                          {student.student.firstName} {student.student.lastName}
                        </Text>
                        <Text style={[styles.studentNumberText, styles.studentNumberColumn]}>
                          {student.student.studentNumber}
                        </Text>

                        <View style={styles.attendanceColumn}>
                          <View style={styles.attendanceButtons}>
                            {(Object.keys(attendanceLabels) as Array<
                              keyof typeof attendanceLabels
                            >).map((status) => (
                              <Pressable
                                key={status}
                                disabled={isSaving}
                                onPress={() =>
                                  void handleAttendance(activity, student, status)
                                }
                                style={[
                                  styles.attendanceButton,
                                  currentStatus === status
                                    ? styles.attendanceButtonActive
                                    : null,
                                  isSaving ? styles.attendanceButtonDisabled : null,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attendanceButtonText,
                                    currentStatus === status
                                      ? styles.attendanceButtonTextActive
                                      : null,
                                  ]}
                                >
                                  {attendanceLabels[status]}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 21, color: "#6B7280" },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 12, fontSize: 18, fontWeight: "700", color: "#111827" },
  overviewCard: { padding: 16, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", gap: 14 },
  activityCard: { padding: 16, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardDescription: { marginTop: 5, fontSize: 13, lineHeight: 18, color: "#6B7280" },
  countBadge: { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#111827" },
  countBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  classGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  classItem: { width: "48%", minHeight: 76, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F8FAFC", justifyContent: "center" },
  className: { fontSize: 16, fontWeight: "700", color: "#111827" },
  classLevel: { marginTop: 5, fontSize: 12, color: "#6B7280" },
  activityList: { gap: 14 },
  activityClass: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  activityHeader: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#F8FAFC", gap: 10 },
  activityClassName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  activityMeta: { marginTop: 5, fontSize: 12, color: "#6B7280" },
  scheduleBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: "#E5E7EB" },
  scheduleBadgeText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  studentHeader: { flexDirection: "row", alignItems: "center", minHeight: 38, paddingHorizontal: 12, backgroundColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  studentHeaderText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  studentRow: { flexDirection: "row", alignItems: "center", minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  studentNameColumn: { flex: 1, paddingRight: 8 },
  studentNumberColumn: { width: 76, paddingRight: 6 },
  attendanceColumn: { width: 132, alignItems: "flex-end" },
  studentNameText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  studentNumberText: { fontSize: 12, color: "#6B7280" },
  attendanceButtons: { flexDirection: "row", gap: 5 },
  attendanceButton: { width: 34, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" },
  attendanceButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  attendanceButtonDisabled: { opacity: 0.45 },
  attendanceButtonText: { fontSize: 12, fontWeight: "800", color: "#374151" },
  attendanceButtonTextActive: { color: "#FFFFFF" },
  scheduleButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#111827" },
  scheduleButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  loadingBlock: { minHeight: 90, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: "#6B7280", fontSize: 13 },
});
