import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

type ParentDashboardProps = {
  firstName: string;
};

const SCHEDULE_DAYS: {
  key: ParentScheduleDay;
  label: string;
}[] = [
  { key: "MONDAY", label: "Lundi" },
  { key: "TUESDAY", label: "Mardi" },
  { key: "WEDNESDAY", label: "Mercredi" },
  { key: "THURSDAY", label: "Jeudi" },
  { key: "FRIDAY", label: "Vendredi" },
  { key: "SATURDAY", label: "Samedi" },
];

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
  const { width } = useWindowDimensions();
  const isPhone = width < 600;
  const isTablet = width < 900;

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

  return (
    <View style={styles.scheduleGrid}>
      {SCHEDULE_DAYS.map((day) => {
        const daySchedules = schedules
          .filter((schedule) => schedule.dayOfWeek === day.key)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const isToday = day.key === today;

        return (
          <View
            key={day.key}
            style={[
              styles.scheduleDay,
              isPhone ? styles.scheduleDayPhone : isTablet ? styles.scheduleDayTablet : styles.scheduleDayWide,
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
                {day.label}
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
          id: "assignments",
          title: "Devoirs",
          description: selectedChild
            ? `Suivre les devoirs de ${selectedChild.firstName}.`
            : "Sélectionnez un enfant pour suivre ses devoirs.",
        },
        {
          id: "medical-record",
          title: "Fiche médicale",
          value: selectedChild ? "Consulter" : "—",
          description: selectedChild
            ? `Informations médicales de ${selectedChild.firstName}.`
            : "Sélectionnez un enfant pour consulter sa fiche médicale.",
          onPress: selectedChild
            ? () =>
                router.push({
                  pathname: "/(app)/medical-record",
                  params: { studentId: selectedChild.id },
                })
            : undefined,
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
    >
      <Text style={styles.title}>Espace parent</Text>
      <Text style={styles.subtitle}>
        Bonjour {firstName}, voici le suivi scolaire de votre enfant.
      </Text>

      {selectedChild && (
        <Text style={styles.selectedChild}>
          Enfant suivi : {selectedChild.firstName} {selectedChild.lastName} ·{" "}
          {selectedChildDescription}
        </Text>
      )}

      {sections.map((section) => (
        <DashboardSection key={section.id} {...section} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
  },
  selectedChild: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  scheduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  scheduleDay: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  scheduleDayPhone: { width: "100%", marginBottom: 10 },
  scheduleDayTablet: { width: "48.5%", marginBottom: 10 },
  scheduleDayWide: { width: "31.8%", marginBottom: 10 },
  scheduleDayToday: {
    borderColor: "#344976",
    backgroundColor: "#EEF2F7",
  },
  scheduleDayHeader: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  scheduleDayHeaderToday: {
    backgroundColor: "#344976",
    borderBottomColor: "#344976",
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
    margin: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scheduleTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#344976",
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
