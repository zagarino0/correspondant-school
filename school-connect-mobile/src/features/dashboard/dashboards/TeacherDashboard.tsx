import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getTeacherDashboard } from "../../../services/teacher/teacher.service";
import type { TeacherDashboardResponse } from "../teacher-dashboard.types";

function getLocalDateKey(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const dayLabels: Record<
  TeacherDashboardResponse["today"]["dayOfWeek"],
  string
> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

type TeacherDashboardProps = {
  firstName: string;
};

export function TeacherDashboard({ firstName }: TeacherDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] =
    useState<TeacherDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadDashboard() {
        try {
          setLoading(true);
          setHasError(false);

          const response = await getTeacherDashboard(getLocalDateKey());

          if (isMounted) {
            setDashboard(response);
          }
        } catch {
          if (isMounted) {
            setHasError(true);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      void loadDashboard();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const classesCount = dashboard?.classes.length ?? null;
  const scheduleCount = dashboard?.today.scheduleCount ?? null;
  const pendingAssignments = dashboard?.assignments.pendingCount ?? null;
  const studentsToRecord = dashboard?.attendance.studentsToRecordCount ?? null;
  const nextCourse = dashboard?.today.schedules[0] ?? null;

  const sections: DashboardSectionData[] = [
    {
      id: "teacher-overview",
      title: "Vue d'ensemble",
      cards: [
        {
          id: "classes",
          title: "Mes classes",
          value: loading ? "…" : hasError ? "—" : String(classesCount ?? 0),
          description: loading
            ? "Chargement de vos classes."
            : hasError
              ? "Impossible de charger vos classes."
              : "Classes qui vous sont affectées.",
          onPress: () => router.push("/classes"),
        },
        {
          id: "today",
          title: "Cours aujourd'hui",
          value: loading ? "…" : hasError ? "—" : String(scheduleCount ?? 0),
          description: loading
            ? "Chargement de votre emploi du temps."
            : hasError
              ? "Impossible de charger l'emploi du temps."
              : nextCourse
                ? `${nextCourse.startTime} · ${nextCourse.subject}`
                : "Aucun cours prévu aujourd'hui.",
          onPress: () => router.push("/(app)/schedule"),
        },
        {
          id: "assignments",
          title: "Devoirs à suivre",
          value: loading
            ? "…"
            : hasError
              ? "—"
              : String(pendingAssignments ?? 0),
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
          value: loading
            ? "…"
            : hasError
              ? "—"
              : String(studentsToRecord ?? 0),
          description: loading
            ? "Chargement des présences."
            : hasError
              ? "Impossible de charger les présences."
              : studentsToRecord === 0
                ? "Toutes les présences du jour sont enregistrées."
                : "Élèves sans présence enregistrée aujourd'hui.",
          onPress: () => router.push("/attendance"),
        },
      ],
    },
    {
      id: "teacher-work",
      title: "Activité pédagogique",
      cards: [
        {
          id: "schedule",
          title: "Emploi du temps",
          description: dashboard
            ? `${dayLabels[dashboard.today.dayOfWeek]} · ${dashboard.today.scheduleCount} cours aujourd'hui.`
            : "Consulter vos cours et horaires.",
          onPress: () => router.push("/(app)/schedule"),
        },
        {
          id: "assignments",
          title: "Devoirs",
          description: "Préparer et suivre les travaux des élèves.",
          onPress: () => router.push("/(app)/assignments"),
        },
        {
          id: "attendance",
          title: "Présences",
          description: "Gérer les présences et absences selon votre emploi du temps.",
          onPress: () => router.push("/attendance"),
        },
        {
          id: "classes",
          title: "Mes classes",
          description: "Accéder à vos classes et élèves.",
          onPress: () => router.push("/classes"),
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
    lineHeight: 21,
    color: "#6B7280",
  },
});
