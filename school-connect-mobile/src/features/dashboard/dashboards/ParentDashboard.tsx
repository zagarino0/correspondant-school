import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardCardData, DashboardSectionData } from "../dashboard.types";
import {
  getChildSchedule,
  getMyChildren,
  type ParentChild,
  type ParentChildSchedule,
  type ParentScheduleDay,
} from "../../../services/parents/parent.service";
import {
  getStudentAttendance,
  type ParentAttendanceRecord,
} from "../../../services/attendance/attendance.service";
import {
  getStudentGrades,
  type ParentGrade,
} from "../../../services/grades/grade.service";
import { getMedicalAccess } from "../../../services/medical/medical.service";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import { getMyChildrenDiscipline, type ApprovedDisciplinaryAction } from "../../../services/discipline/discipline.service";

type ParentDashboardProps = {
  firstName: string;
};

function getScheduleDayLabel(day: ParentScheduleDay): string {
  const labels: Record<ParentScheduleDay, string> = {
    MONDAY: "Lundi",
    TUESDAY: "Mardi",
    WEDNESDAY: "Mercredi",
    THURSDAY: "Jeudi",
    FRIDAY: "Vendredi",
    SATURDAY: "Samedi",
    SUNDAY: "Dimanche",
  };

  return labels[day];
}

function getTodayScheduleDay(): ParentScheduleDay {
  const days: ParentScheduleDay[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  return days[new Date().getDay()];
}

function ScheduleGrid({
  schedules,
  loading,
  error,
}: {
  schedules: ParentChildSchedule[];
  loading: boolean;
  error: boolean;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const columns = containerWidth >= 900 ? 3 : containerWidth >= 600 ? 2 : 1;
  const columnGap = 10;
  const dayWidth =
    columns === 1
      ? "100%"
      : Math.max(
          0,
          (containerWidth - columnGap * (columns - 1)) / columns,
        );

  if (loading) {
    return (
      <View style={styles.scheduleState}>
        <Text style={styles.scheduleStateText}>
          Chargement de l’emploi du temps…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.scheduleState}>
        <Text style={styles.scheduleStateText}>
          Impossible de charger l’emploi du temps.
        </Text>
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.scheduleState}>
        <Text style={styles.scheduleStateText}>
          Aucun créneau n’est enregistré pour cette classe.
        </Text>
      </View>
    );
  }

  const today = getTodayScheduleDay();
  const days = Array.from(
    new Set(schedules.map((schedule) => schedule.dayOfWeek)),
  );

  return (
    <View
      style={styles.scheduleGrid}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {days.map((day) => {
        const daySchedules = schedules
          .filter((schedule) => schedule.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const isToday = day === today;

        return (
          <View
            key={day}
            style={[
              styles.scheduleDay,
              { width: dayWidth },
              isToday ? styles.scheduleDayToday : null,
            ]}
          >
            <View
              style={[
                styles.scheduleDayHeader,
                isToday ? styles.scheduleDayHeaderToday : null,
              ]}
            >
              <Text
                style={[
                  styles.scheduleDayLabel,
                  isToday ? styles.scheduleDayLabelToday : null,
                ]}
              >
                {getScheduleDayLabel(day)}
              </Text>
              {isToday ? (
                <Text style={styles.todayLabel}>Aujourd’hui</Text>
              ) : null}
            </View>

            {daySchedules.length > 0 ? (
              daySchedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleLesson}>
                  <Text style={styles.scheduleTime}>
                    {schedule.startTime} – {schedule.endTime}
                  </Text>
                  <Text style={styles.scheduleSubject} numberOfLines={2}>
                    {schedule.subject}
                  </Text>
                  <Text style={styles.scheduleTeacher} numberOfLines={1}>
                    {schedule.teacher.firstName} {schedule.teacher.lastName}
                  </Text>
                  {schedule.room ? (
                    <Text style={styles.scheduleRoom}>
                      Salle {schedule.room}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.scheduleEmpty}>
                <Text style={styles.scheduleEmptyText}>Aucun cours</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function ParentDashboard({ firstName }: ParentDashboardProps) {
  const router = useRouter();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<ParentAttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(false);
  const [grades, setGrades] = useState<ParentGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState(false);
  const [schedule, setSchedule] = useState<ParentChildSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState(false);
  const [medicalAllowed, setMedicalAllowed] = useState<boolean | null>(null);
  const [discipline, setDiscipline] = useState<ApprovedDisciplinaryAction[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(false);
  const [disciplineError, setDisciplineError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadChildren() {
      try {
        setChildrenLoading(true);
        setChildrenError(false);

        const response = await getMyChildren();

        if (isMounted) {
          setChildren(response.children);
          setSelectedChildId((current) => {
            if (
              current &&
              response.children.some((child) => child.id === current)
            ) {
              return current;
            }

            return response.children[0]?.id ?? null;
          });
        }
      } catch {
        if (isMounted) {
          setChildrenError(true);
          setChildren([]);
          setSelectedChildId(null);
        }
      } finally {
        if (isMounted) {
          setChildrenLoading(false);
        }
      }
    }

    void loadChildren();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getMedicalAccess()
      .then((access) => {
        if (isMounted) setMedicalAllowed(access.allowed);
      })
      .catch(() => {
        if (isMounted) setMedicalAllowed(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAttendance() {
      if (!selectedChildId) {
        setAttendance([]);
        setAttendanceLoading(false);
        setAttendanceError(false);
        return;
      }

      try {
        setAttendanceLoading(true);
        setAttendanceError(false);

        const response = await getStudentAttendance(selectedChildId);

        if (isMounted) {
          setAttendance(response.attendance);
        }
      } catch {
        if (isMounted) {
          setAttendance([]);
          setAttendanceError(true);
        }
      } finally {
        if (isMounted) {
          setAttendanceLoading(false);
        }
      }
    }

    void loadAttendance();

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  useEffect(() => {
    if (!selectedChildId) return;

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (
          event.type !== "attendance:event" &&
          event.type !== "parent:summons:new"
        ) {
          return;
        }

        if (
          event.type === "attendance:event" &&
          event.payload.attendance.studentId !== selectedChildId
        ) {
          return;
        }

        void getStudentAttendance(selectedChildId)
          .then((response) => setAttendance(response.attendance))
          .catch(() => undefined);
      },
    });

    connection.connect();

    return () => connection.close();
  }, [selectedChildId]);

  useEffect(() => {
    let isMounted = true;

    async function loadGrades() {
      if (!selectedChildId) {
        setGrades([]);
        setGradesLoading(false);
        setGradesError(false);
        return;
      }

      try {
        setGradesLoading(true);
        setGradesError(false);

        const response = await getStudentGrades(selectedChildId);

        if (isMounted) {
          setGrades(response.grades);
        }
      } catch {
        if (isMounted) {
          setGrades([]);
          setGradesError(true);
        }
      } finally {
        if (isMounted) {
          setGradesLoading(false);
        }
      }
    }

    void loadGrades();

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      if (!selectedChildId) {
        setSchedule([]);
        setScheduleLoading(false);
        setScheduleError(false);
        return;
      }

      try {
        setScheduleLoading(true);
        setScheduleError(false);

        const response = await getChildSchedule(selectedChildId);

        if (isMounted) {
          setSchedule(response.schedules);
        }
      } catch {
        if (isMounted) {
          setSchedule([]);
          setScheduleError(true);
        }
      } finally {
        if (isMounted) {
          setScheduleLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [selectedChildId]);


  useEffect(() => {
    let mounted = true;

    const loadDiscipline = async () => {
      if (!selectedChildId) {
        setDiscipline([]);
        setDisciplineLoading(false);
        setDisciplineError(false);
        return;
      }

      try {
        setDisciplineLoading(true);
        setDisciplineError(false);
        const response = await getMyChildrenDiscipline();

        if (mounted) {
          setDiscipline(
            response.actions.filter((action) => action.studentId === selectedChildId),
          );
        }
      } catch {
        if (mounted) {
          setDiscipline([]);
          setDisciplineError(true);
        }
      } finally {
        if (mounted) setDisciplineLoading(false);
      }
    };

    void loadDiscipline();

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (event.type !== "discipline:updated") return;
        void loadDiscipline();
      },
    });
    connection.connect();

    return () => {
      mounted = false;
      connection.close();
    };
  }, [selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const childCards: DashboardCardData[] = children.map((child) => {
    const isSelected = child.id === selectedChildId;

    return {
      id: child.id,
      title: `${child.firstName} ${child.lastName}`,
      value: child.enrollment?.class.name ?? "Classe non renseignée",
      badge: isSelected ? "Sélectionné" : undefined,
      description: child.enrollment
        ? `${child.enrollment.class.level ?? "Niveau non renseigné"} · ${child.enrollment.academicYear.name}`
        : "Aucune inscription active.",
      onPress: () => setSelectedChildId(child.id),
    };
  });

  if (childrenLoading) {
    childCards.push({
      id: "children-loading",
      title: "Mes enfants",
      value: "…",
      description: "Chargement des enfants.",
    });
  } else if (childrenError) {
    childCards.push({
      id: "children-error",
      title: "Mes enfants",
      value: "—",
      description: "Impossible de charger les enfants.",
    });
  } else if (children.length === 0) {
    childCards.push({
      id: "children-empty",
      title: "Mes enfants",
      description: "Aucun enfant actif n’est associé à ce compte.",
    });
  }

  const attendanceSummary = useMemo(() => {
    return attendance.reduce(
      (summary, record) => {
        summary[record.status] += 1;
        return summary;
      },
      {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        EXCUSED: 0,
      } as Record<ParentAttendanceRecord["status"], number>,
    );
  }, [attendance]);

  const gradeSummary = useMemo(() => {
    if (grades.length === 0) {
      return {
        count: 0,
        average: null as number | null,
      };
    }

    const weightedTotal = grades.reduce(
      (total, grade) =>
        total + (grade.value / grade.maxValue) * 20 * grade.coefficient,
      0,
    );

    const coefficientTotal = grades.reduce(
      (total, grade) => total + grade.coefficient,
      0,
    );

    return {
      count: grades.length,
      average:
        coefficientTotal > 0 ? weightedTotal / coefficientTotal : null,
    };
  }, [grades]);

  const resultsDescription = !selectedChild
    ? "Sélectionnez un enfant pour consulter ses résultats."
    : gradesLoading
      ? "Chargement des résultats."
      : gradesError
        ? "Impossible de charger les résultats."
        : gradeSummary.count === 0
          ? "Aucune note enregistrée."
          : `Moyenne : ${gradeSummary.average?.toFixed(2)} / 20 · ${gradeSummary.count} note(s)`;

  const attendanceDescription = !selectedChild
    ? "Sélectionnez un enfant pour consulter ses présences."
    : attendanceLoading
      ? "Chargement des présences."
      : attendanceError
        ? "Impossible de charger les présences."
        : `${attendanceSummary.ABSENT} absence(s) · ${attendanceSummary.LATE} retard(s) · ${attendanceSummary.EXCUSED} justifiée(s)`;

  const selectedChildDescription = selectedChild
    ? selectedChild.enrollment
      ? `${selectedChild.enrollment.class.name} · ${selectedChild.enrollment.academicYear.name}`
      : "Aucune inscription active."
    : "Sélectionnez un enfant pour afficher son suivi.";

  const sections: DashboardSectionData[] = [
    {
      id: "parent-children",
      title: "Mes enfants",
      cards: childCards,
    },
    {
      id: "parent-follow-up",
      title: "Suivi scolaire",
      cards: [
        {
          id: "attendance",
          title: "Présences",
          value: attendanceLoading
            ? "…"
            : attendanceError
              ? "—"
              : selectedChild
                ? String(attendance.length)
                : "—",
          description: attendanceDescription,
        },
        {
          id: "results",
          title: "Résultats",
          onPress:
            selectedChild && !gradesLoading && !gradesError
              ? () =>
                  router.push({
                    pathname: "/(app)/results",
                    params: { studentId: selectedChild.id },
                  })
              : undefined,
          value: gradesLoading
            ? "…"
            : gradesError
              ? "—"
              : selectedChild
                ? gradeSummary.average !== null
                  ? `${gradeSummary.average.toFixed(2)} / 20`
                  : "—"
                : "—",
          description: resultsDescription,
        },
        {
          id: "discipline",
          title: "Discipline",
          value: disciplineLoading
            ? "…"
            : disciplineError
              ? "—"
              : selectedChild
                ? String(discipline.length)
                : "—",
          description: !selectedChild
            ? "Sélectionnez un enfant pour consulter son suivi disciplinaire."
            : disciplineLoading
              ? "Chargement du suivi disciplinaire."
              : disciplineError
                ? "Impossible de charger le suivi disciplinaire."
                : discipline.length === 0
                  ? "Aucune mesure disciplinaire validée."
                  : `Dernière mesure : ${discipline[0].type} · ${discipline[0].status === "COMPLETED" ? "Terminée" : "Active"}.`,
        },
        {
          id: "assignments",
          title: "Devoirs",
          description: selectedChild
            ? `Suivre les devoirs de ${selectedChild.firstName}.`
            : "Sélectionnez un enfant pour suivre ses devoirs.",
        },
        {
          id: "medical-record",
          title: "Fiche médicale",
          value:
            medicalAllowed === null
              ? "…"
              : medicalAllowed && selectedChild
                ? "Consulter"
                : "—",
          description:
            medicalAllowed === null
              ? "Vérification de l’accès médical."
              : !medicalAllowed
                ? "L’accès à la fiche médicale n’est pas disponible pour ce compte."
                : selectedChild
                  ? `Informations médicales de ${selectedChild.firstName}.`
                  : "Sélectionnez un enfant pour consulter sa fiche médicale.",
          onPress:
            medicalAllowed && selectedChild
              ? () =>
                  router.push({
                    pathname: "/(app)/medical",
                    params: { userId: selectedChild.id },
                  })
              : undefined,
        },
        {
          id: "medical-reports",
          title: "Rapports médicaux",
          value:
            medicalAllowed === null
              ? "…"
              : medicalAllowed && selectedChild
                ? "Consulter"
                : "—",
          description:
            medicalAllowed === null
              ? "Vérification de l’accès médical."
              : !medicalAllowed
                ? "Les rapports médicaux ne sont pas disponibles pour ce compte."
                : selectedChild
                  ? `Consulter les rapports médicaux de ${selectedChild.firstName}.`
                  : "Sélectionnez un enfant pour consulter ses rapports.",
          onPress:
            medicalAllowed && selectedChild
              ? () =>
                  router.push({
                    pathname: "/(app)/medical-reports",
                    params: { userId: selectedChild.id },
                  })
              : undefined,
        },
        {
          id: "authorizations",
          title: "Autorisations",
          value: "Gérer",
          description: selectedChild
            ? `Demandes d'autorisation pour ${selectedChild.firstName}.`
            : "Créer et suivre vos demandes d'autorisation.",
          onPress: () => router.push("/(app)/authorizations"),
        },
        {
          id: "schedule",
          title: "Emploi du temps",
          value: selectedChild?.enrollment?.class.name ?? "—",
          badge: scheduleLoading
            ? "Chargement"
            : scheduleError
              ? "Erreur"
              : schedule.length > 0
                ? `${schedule.length} cours`
                : undefined,
          description: selectedChild
            ? `Planning réel de ${selectedChild.firstName} · semaine scolaire`
            : "Sélectionnez un enfant pour afficher son emploi du temps.",
          fullWidth: true,
          content: (
            <ScheduleGrid
              schedules={schedule}
              loading={scheduleLoading}
              error={scheduleError}
            />
          ),
        },
      ],
    },

  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>
            {selectedChild?.firstName?.charAt(0) ?? "P"}
          </Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>ESPACE PARENT</Text>
          <Text style={styles.title}>Suivi de la scolarité</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {selectedChild
              ? `${selectedChild.firstName} ${selectedChild.lastName} · ${selectedChildDescription}`
              : "Sélectionnez un enfant pour commencer le suivi."}
          </Text>
        </View>
      </View>

      {sections.map((section) => (
        <DashboardSection key={section.id} {...section} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#101828",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
  },
  heroIconText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#C7D2FE",
  },
  title: {
    marginTop: 3,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#D0D5DD",
  },
  scheduleGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },
  scheduleDay: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  scheduleDayToday: {
    borderColor: "#C7D2FE",
    backgroundColor: "#F5F7FF",
  },
  scheduleDayHeader: {
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 8,
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E7EC",
  },
  scheduleDayHeaderToday: {
    backgroundColor: "#4F46E5",
    borderBottomColor: "#4F46E5",
  },
  scheduleDayLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  scheduleDayLabelToday: {
    color: "#FFFFFF",
  },
  todayLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#E7ECF5",
  },
  scheduleLesson: {
    margin: 7,
    padding: 9,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  scheduleTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  scheduleSubject: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  scheduleTeacher: {
    marginTop: 5,
    fontSize: 11,
    color: "#4B5563",
  },
  scheduleRoom: {
    marginTop: 3,
    fontSize: 10,
    color: "#6B7280",
  },
  scheduleEmpty: {
    minHeight: 72,
    padding: 12,
    justifyContent: "center",
  },
  scheduleEmptyText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },
  scheduleState: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  scheduleStateText: {
    fontSize: 13,
    color: "#6B7280",
  },
});
