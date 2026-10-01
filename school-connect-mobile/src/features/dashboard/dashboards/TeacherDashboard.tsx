import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getTeacherDashboard } from "../../../services/teacher/teacher.service";
import {
  getTeacherAttendance,
  getTeacherClasses,
  getTeacherObservations,
  saveTeacherAttendance,
  saveTeacherObservation,
} from "../../../services/teacher/teacher-class.service";
import { getMyTeacherSchedule } from "../../../services/schedule/schedule.service";
import type { TeacherDashboardResponse } from "../teacher-dashboard.types";
import type {
  TeacherAttendanceRow,
  TeacherClass,
  TeacherObservation,
} from "../teacher-classes.types";
import type { TeacherSchedule } from "../../schedule/schedule.types";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import { TeacherIncidentCard } from "../components/TeacherIncidentCard";

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
  observation: TeacherObservation | null;
};

const attendanceLabels = {
  ABSENT: "A",
  PRESENT: "P",
  LATE: "R",
} as const;

type SlotState = "ACTIVE" | "UPCOMING" | "COMPLETED";

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getSlotState(schedule: TeacherSchedule, nowMinutes: number): SlotState {
  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);

  if (nowMinutes >= start && nowMinutes < end) return "ACTIVE";
  if (nowMinutes < start) return "UPCOMING";
  return "COMPLETED";
}

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
  const [observationDrafts, setObservationDrafts] = useState<Record<string, string>>({});
  const [savingObservation, setSavingObservation] = useState<string | null>(null);
  const [editingObservation, setEditingObservation] = useState<string | null>(null);
  const [observationConfirmation, setObservationConfirmation] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const date = new Date();
    return date.getHours() * 60 + date.getMinutes();
  });
  const previousActiveSlotId = useRef<string | null>(null);

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

      const todaySchedules = scheduleResponse.schedules
        .filter((item) => todayScheduleIds.has(item.id))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      const [observationsResponse] = await Promise.all([
        getTeacherObservations(dashboardResponse.date),
      ]);

      const observationsBySchedule = new Map(
        observationsResponse.observations.map((observation) => [
          observation.scheduleId,
          observation,
        ]),
      );

      const activities = await Promise.all(
        todaySchedules.map(async (schedule) => {
          const response = await getTeacherAttendance(
            schedule.classId,
            schedule.id,
            dashboardResponse.date,
          );
          return {
            schedule,
            students: response.students,
            observation: observationsBySchedule.get(schedule.id) ?? null,
          };
        }),
      );

      setObservationDrafts(
        Object.fromEntries(
          activities.map((activity) => [
            activity.schedule.id,
            activity.observation?.content ?? "",
          ]),
        ),
      );

      setActivityClasses(activities);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (event.type === "attendance:event" || event.type === "parent:summons:new") {
          void loadDashboard();
          void loadActivity();
        }
      },
    });

    connection.connect();

    return () => connection.close();
  }, [loadActivity, loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
      void loadActivity();

      const refreshClock = () => {
        const date = new Date();
        setNowMinutes(date.getHours() * 60 + date.getMinutes());
      };

      refreshClock();
      const interval = setInterval(refreshClock, 30_000);

      return () => clearInterval(interval);
    }, [loadActivity, loadDashboard]),
  );

  const classesCount = classes.length;
  const scheduleCount = dashboard?.today.scheduleCount ?? null;
  const pendingAssignments = dashboard?.assignments.pendingCount ?? null;
  const studentsToRecord = dashboard?.attendance.studentsToRecordCount ?? null;
  const observationsCount = dashboard?.observations.count ?? null;
  const nextCourse = dashboard?.today.schedules[0] ?? null;

  const activeActivity = useMemo(
    () =>
      activityClasses.find(
        (activity) => getSlotState(activity.schedule, nowMinutes) === "ACTIVE",
      ) ?? null,
    [activityClasses, nowMinutes],
  );

  const nextActivity = useMemo(
    () =>
      activityClasses.find(
        (activity) => getSlotState(activity.schedule, nowMinutes) === "UPCOMING",
      ) ?? null,
    [activityClasses, nowMinutes],
  );

  const sortedActivityClasses = useMemo(() => {
    const stateOrder: Record<SlotState, number> = {
      ACTIVE: 0,
      UPCOMING: 1,
      COMPLETED: 2,
    };

    return [...activityClasses].sort((a, b) => {
      const stateDifference =
        stateOrder[getSlotState(a.schedule, nowMinutes)] -
        stateOrder[getSlotState(b.schedule, nowMinutes)];

      if (stateDifference !== 0) return stateDifference;

      return timeToMinutes(a.schedule.startTime) - timeToMinutes(b.schedule.startTime);
    });
  }, [activityClasses, nowMinutes]);

  useEffect(() => {
    const currentActiveSlotId = activeActivity?.schedule.id ?? null;
    const previousSlotId = previousActiveSlotId.current;

    if (previousSlotId && !currentActiveSlotId) {
      router.replace("/(app)");
    }

    previousActiveSlotId.current = currentActiveSlotId;
  }, [activeActivity?.schedule.id, router]);

  const handleAttendance = useCallback(
    async (
      activity: ActivityClass,
      student: TeacherAttendanceRow,
      status: "PRESENT" | "ABSENT",
    ) => {
      if (activity.schedule.id !== activeActivity?.schedule.id) return;

      try {
        setSavingAttendance(student.enrollmentId);
        const date = dashboard?.date ?? getLocalDateKey();

        await saveTeacherAttendance(activity.schedule.classId, {
          enrollmentId: student.enrollmentId,
          scheduleId: activity.schedule.id,
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
                            events: [],
                          },
                    }
                  : row,
              ),
            };
          }),
        );
      } catch {
        // The next focus refreshes the attendance data.
      } finally {
        setSavingAttendance(null);
      }
    },
    [activeActivity?.schedule.id, dashboard?.date],
  );

  const handleObservationSave = useCallback(
    async (activity: ActivityClass) => {
      if (activity.schedule.id !== activeActivity?.schedule.id) return;

      const content = observationDrafts[activity.schedule.id]?.trim() ?? "";
      if (!content) return;

      try {
        setSavingObservation(activity.schedule.id);
        const date = dashboard?.date ?? getLocalDateKey();
        const response = await saveTeacherObservation({
          scheduleId: activity.schedule.id,
          date,
          content,
        });

        const savedObservation = response.observation as TeacherObservation;

        setActivityClasses((current) =>
          current.map((item) =>
            item.schedule.id === activity.schedule.id
              ? { ...item, observation: savedObservation }
              : item,
          ),
        );
        setEditingObservation(null);
        setObservationConfirmation(activity.schedule.id);
        setTimeout(() => {
          setObservationConfirmation((current) =>
            current === activity.schedule.id ? null : current,
          );
        }, 2500);
      } catch {
        // The next focus refreshes the observation data.
      } finally {
        setSavingObservation(null);
      }
    },
    [activeActivity?.schedule.id, dashboard?.date, observationDrafts],
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
          id: "observations",
          title: "Observations pédagogiques",
          value: loading ? "…" : hasError ? "—" : String(observationsCount ?? 0),
          description: loading
            ? "Chargement de l'historique."
            : hasError
              ? "Impossible de charger l'historique."
              : "Voir la grille historique des observations.",
          onPress: () => router.push("./observations"),
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

      <TeacherIncidentCard classes={classes} onCreated={() => void loadDashboard()} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité pédagogique</Text>
        <View style={styles.activityCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Classes synchronisées avec l'emploi du temps</Text>
              <Text style={styles.cardDescription}>
                La classe et la matière viennent automatiquement de vos cours du jour.
                Seul le créneau actif permet de modifier les présences.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/schedule")}
              style={styles.scheduleButton}
            >
              <Text style={styles.scheduleButtonText}>Planning</Text>
            </Pressable>
          </View>

          {activeActivity ? (
            <View style={styles.activeSlotNotice}>
              <Text style={styles.activeSlotTitle}>Créneau actif</Text>
              <Text style={styles.activeSlotText}>
                {activeActivity.schedule.class.name} — {activeActivity.schedule.subject}
                {" · "}
                {activeActivity.schedule.startTime} – {activeActivity.schedule.endTime}
              </Text>
            </View>
          ) : nextActivity ? (
            <View style={styles.nextSlotNotice}>
              <Text style={styles.nextSlotTitle}>Aucun créneau actif</Text>
              <Text style={styles.nextSlotText}>
                Prochain cours : {nextActivity.schedule.startTime} —{" "}
                {nextActivity.schedule.class.name} — {nextActivity.schedule.subject}
              </Text>
            </View>
          ) : null}

          {activityLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator />
              <Text style={styles.muted}>Synchronisation avec l'emploi du temps…</Text>
            </View>
          ) : activityClasses.length === 0 ? (
            <Text style={styles.muted}>{activityEmptyText}</Text>
          ) : (
            <View style={styles.activityList}>
              {sortedActivityClasses.map((activity) => {
                const slotState = getSlotState(activity.schedule, nowMinutes);
                const isActive = slotState === "ACTIVE";
                const stateLabel =
                  slotState === "ACTIVE"
                    ? "Créneau actif"
                    : slotState === "UPCOMING"
                      ? "À venir"
                      : "Terminé";

                return (
                  <View
                    key={activity.schedule.id}
                    style={[
                      styles.activityClass,
                      !isActive ? styles.activityClassLocked : null,
                    ]}
                  >
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
                      <View
                        style={[
                          styles.scheduleBadge,
                          slotState === "ACTIVE"
                            ? styles.scheduleBadgeActive
                            : slotState === "UPCOMING"
                              ? styles.scheduleBadgeUpcoming
                              : styles.scheduleBadgeCompleted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.scheduleBadgeText,
                            slotState === "ACTIVE"
                              ? styles.scheduleBadgeTextActive
                              : slotState === "UPCOMING"
                                ? styles.scheduleBadgeTextUpcoming
                                : styles.scheduleBadgeTextCompleted,
                          ]}
                        >
                          {stateLabel}
                        </Text>
                      </View>
                    </View>

                    {isActive ? (
                      <>
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

                        <View style={styles.observationBlock}>
                          <View style={styles.observationHeader}>
                            <Text style={styles.observationTitle}>Observation du cours</Text>
                            {activity.observation ? (
                              <Text style={styles.observationSaved}>Enregistrée · Fermée</Text>
                            ) : null}
                          </View>

                          {observationConfirmation === activity.schedule.id ? (
                            <View style={styles.observationConfirmation}>
                              <Text style={styles.observationConfirmationText}>
                                ✓ Observation enregistrée
                              </Text>
                            </View>
                          ) : null}

                          <TextInput
                            value={observationDrafts[activity.schedule.id] ?? ""}
                            onChangeText={(value) =>
                              setObservationDrafts((current) => ({
                                ...current,
                                [activity.schedule.id]: value,
                              }))
                            }
                            placeholder="Ex. Nouvelle leçon avec TD"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            editable={
                              !activity.observation ||
                              editingObservation === activity.schedule.id
                            }
                            style={[
                              styles.observationInput,
                              activity.observation &&
                              editingObservation !== activity.schedule.id
                                ? styles.observationInputLocked
                                : null,
                            ]}
                          />

                          {activity.observation &&
                          editingObservation !== activity.schedule.id ? (
                            <Pressable
                              onPress={() => {
                                setEditingObservation(activity.schedule.id);
                                setObservationConfirmation(null);
                              }}
                              style={styles.observationEditButton}
                            >
                              <Text style={styles.observationEditButtonText}>Modifier</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              disabled={
                                savingObservation === activity.schedule.id ||
                                !(observationDrafts[activity.schedule.id] ?? "").trim()
                              }
                              onPress={() => void handleObservationSave(activity)}
                              style={[
                                styles.observationButton,
                                (savingObservation === activity.schedule.id ||
                                  !(observationDrafts[activity.schedule.id] ?? "").trim())
                                  ? styles.observationButtonDisabled
                                  : null,
                              ]}
                            >
                              {savingObservation === activity.schedule.id ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <Text style={styles.observationButtonText}>
                                  Enregistrer l'observation
                                </Text>
                              )}
                            </Pressable>
                          )}
                        </View>

                        {activity.students.map((student) => {
                          const currentStatus = student.attendance?.status ?? null;
                          const isSaving = savingAttendance === student.enrollmentId;

                          return (
                            <View key={student.enrollmentId} style={styles.studentRow}>
                              <View style={styles.studentNameColumn}>
                                <Text style={styles.studentNameText}>
                                  {student.student.firstName} {student.student.lastName}
                                </Text>
                                <Text style={styles.studentNumberText}>
                                  {student.student.studentNumber}
                                </Text>
                                {student.attendance ? (
                                  <View style={styles.attendanceDetails}>
                                    {student.attendance.status === "LATE" ? (
                                      <>
                                        <Text style={styles.attendanceStatusText}>
                                          Retard
                                          {student.attendance.arrivalTime
                                            ? ` · arrivée ${new Date(student.attendance.arrivalTime).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}`
                                            : ""}
                                        </Text>
                                        {student.attendance.reason ? (
                                          <Text style={styles.attendanceDetailText}>
                                            Motif : {student.attendance.reason}
                                          </Text>
                                        ) : null}
                                        {student.attendance.note ? (
                                          <Text style={styles.attendanceDetailText}>
                                            Note : {student.attendance.note}
                                          </Text>
                                        ) : null}
                                        {student.attendance.events?.[0] ? (
                                          <Text style={styles.attendanceDetailText}>
                                            {student.attendance.events[0].type === "LATE_AUTHORIZED"
                                              ? "Entrée autorisée"
                                              : student.attendance.events[0].type === "LATE_NOT_AUTHORIZED"
                                                ? "Entrée non autorisée"
                                                : ""}
                                            {student.attendance.events[0].note
                                              ? ` · ${student.attendance.events[0].note}`
                                              : ""}
                                          </Text>
                                        ) : null}
                                      </>
                                    ) : student.attendance.events?.[0] ? (
                                      <Text style={styles.attendanceDetailText}>
                                        {student.attendance.events[0].type === "ABSENCE_JUSTIFIED"
                                          ? "Absence · justifiée"
                                          : student.attendance.events[0].type === "ABSENCE_UNJUSTIFIED"
                                            ? "Absence · non justifiée"
                                            : ""}
                                      </Text>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>

                              <View style={styles.attendanceColumn}>
                                <View style={styles.attendanceButtons}>
                                  {(["ABSENT", "PRESENT"] as const).map((status) => (
                                    <Pressable
                                      key={status}
                                      disabled={isSaving}
                                      onPress={() =>
                                        void handleAttendance(activity, student, status)
                                      }
                                      style={[
                                        styles.attendanceButton,
                                        status === "ABSENT"
                                          ? styles.attendanceButtonAbsent
                                          : status === "PRESENT"
                                            ? styles.attendanceButtonPresent
                                            : styles.attendanceButtonLate,
                                        currentStatus === status
                                          ? status === "ABSENT"
                                            ? styles.attendanceButtonAbsentSelected
                                            : status === "PRESENT"
                                              ? styles.attendanceButtonPresentSelected
                                              : styles.attendanceButtonLateSelected
                                          : null,
                                        isSaving ? styles.attendanceButtonDisabled : null,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.attendanceButtonText,
                                          status === "ABSENT"
                                            ? styles.attendanceButtonTextAbsent
                                            : status === "PRESENT"
                                              ? styles.attendanceButtonTextPresent
                                              : styles.attendanceButtonTextLate,
                                          currentStatus === status
                                            ? styles.attendanceButtonTextSelected
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
                      </>
                    ) : null}
                  </View>
                );
              })}
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
  activityClassLocked: { opacity: 0.62 },
  activityHeader: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#F8FAFC", gap: 10 },
  activityClassName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  activityMeta: { marginTop: 5, fontSize: 12, color: "#6B7280" },
  scheduleBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  scheduleBadgeActive: { backgroundColor: "#111827" },
  scheduleBadgeUpcoming: { backgroundColor: "#DBEAFE" },
  scheduleBadgeCompleted: { backgroundColor: "#E5E7EB" },
  scheduleBadgeText: { fontSize: 11, fontWeight: "700" },
  scheduleBadgeTextActive: { color: "#FFFFFF" },
  scheduleBadgeTextUpcoming: { color: "#1D4ED8" },
  scheduleBadgeTextCompleted: { color: "#6B7280" },
  activeSlotNotice: { padding: 12, borderRadius: 10, backgroundColor: "#111827" },
  activeSlotTitle: { fontSize: 11, fontWeight: "800", color: "#FFFFFF", textTransform: "uppercase" },
  activeSlotText: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  nextSlotNotice: { padding: 12, borderRadius: 10, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  nextSlotTitle: { fontSize: 11, fontWeight: "800", color: "#374151", textTransform: "uppercase" },
  nextSlotText: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#111827" },
  studentHeader: { flexDirection: "row", alignItems: "center", minHeight: 38, paddingHorizontal: 12, backgroundColor: "#F1F5F9", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  studentHeaderText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  studentRow: { flexDirection: "row", alignItems: "center", minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  studentRowLocked: { backgroundColor: "#F8FAFC" },
  studentNameColumn: { flex: 1, paddingRight: 8 },
  studentNumberColumn: { width: 76, paddingRight: 6 },
  attendanceColumn: { width: 132, alignItems: "flex-end" },
  studentNameText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  attendanceDetails: { marginTop: 4, gap: 2 },
  attendanceStatusText: { fontSize: 10, fontWeight: "900", color: "#B45309" },
  attendanceDetailText: { fontSize: 10, lineHeight: 14, color: "#64748B" },
  studentNumberText: { fontSize: 12, color: "#6B7280" },
  attendanceButtons: { flexDirection: "row", gap: 5 },
  attendanceButton: { width: 34, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: "#FFFFFF" },
  attendanceButtonAbsent: { borderColor: "#DC2626" },
  attendanceButtonPresent: { borderColor: "#2563EB" },
  attendanceButtonLate: { borderColor: "#D4A017" },
  attendanceButtonSelected: { borderWidth: 1 },
  attendanceButtonDisabled: { opacity: 0.45 },
  attendanceButtonText: { fontSize: 12, fontWeight: "800" },
  attendanceButtonTextAbsent: { color: "#DC2626" },
  attendanceButtonTextPresent: { color: "#2563EB" },
  attendanceButtonTextLate: { color: "#D4A017" },
  attendanceButtonTextSelected: { color: "#FFFFFF" },
  attendanceButtonAbsentSelected: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  attendanceButtonPresentSelected: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  attendanceButtonLateSelected: { backgroundColor: "#D4A017", borderColor: "#D4A017" },
  scheduleButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#111827" },
  scheduleButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  loadingBlock: { minHeight: 90, alignItems: "center", justifyContent: "center", gap: 8 },
  observationBlock: { padding: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", gap: 9 },
  observationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  observationTitle: { fontSize: 12, fontWeight: "800", color: "#111827" },
  observationSaved: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  observationConfirmation: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  observationConfirmationText: { fontSize: 12, fontWeight: "800", color: "#166534" },
  observationEditButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  observationEditButtonText: { color: "#111827", fontSize: 12, fontWeight: "800" },
  observationInput: { minHeight: 74, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 9, backgroundColor: "#FFFFFF", color: "#111827", fontSize: 13, textAlignVertical: "top" },
  observationInputLocked: { backgroundColor: "#F8FAFC", color: "#6B7280" },
  observationButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  observationButtonDisabled: { opacity: 0.45 },
  observationButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  muted: { color: "#6B7280", fontSize: 13 },
});
