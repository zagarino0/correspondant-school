import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardCardData, DashboardSectionData } from "../dashboard.types";
import { getMyChildren, type ParentChild } from "../../../services/parents/parent.service";
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
            if (current && response.children.some((child) => child.id === current)) {
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
          value: attendanceLoading ? "…" : attendanceError ? "—" : selectedChild ? String(attendance.length) : "—",
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
      ],
    },
    {
      id: "parent-communication",
      title: "Communication",
      cards: [
        {
          id: "schedule",
          title: "Emploi du temps",
          description: selectedChild
            ? `Consulter l’emploi du temps de ${selectedChild.firstName}.`
            : "Consulter l’emploi du temps scolaire.",
        },
        {
          id: "announcements",
          title: "Annonces",
          description: "Retrouver les informations de l'établissement.",
        },
        {
          id: "messages",
          title: "Messages",
          description: "Échanger avec l'établissement.",
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
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
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
});
