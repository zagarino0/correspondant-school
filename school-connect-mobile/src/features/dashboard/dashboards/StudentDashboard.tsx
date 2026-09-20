import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getMyAssignments } from "../../../services/assignments/assignment.service";
import { getMyNextSchedule } from "../../../services/schedule/schedule.service";
import type { StudentSchedule } from "../../schedule/schedule.types";
import { normalizeApiError } from "../../../services/api/errors";

type StudentDashboardProps = {
  firstName: string;
};

const dayLabels: Record<StudentSchedule["dayOfWeek"], string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

export function StudentDashboard({
  firstName,
}: StudentDashboardProps) {
  const router = useRouter();
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentsError, setAssignmentsError] = useState(false);
  const [nextSchedule, setNextSchedule] = useState<StudentSchedule | null>(null);
  const [nextScheduleLoading, setNextScheduleLoading] = useState(true);
  const [nextScheduleError, setNextScheduleError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignments() {
      try {
        setAssignmentsError(false);
        const response = await getMyAssignments();

        if (isMounted) {
          setAssignmentCount(response.count);
        }
      } catch {
        if (isMounted) {
          setAssignmentsError(true);
        }
      }
    }

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadNextSchedule() {
      try {
        setNextScheduleError(false);
        setNextScheduleLoading(true);
        const response = await getMyNextSchedule();

        if (isMounted) {
          setNextSchedule(response.schedule);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const apiError = normalizeApiError(error);

        if (apiError.code === "NOT_FOUND") {
          setNextSchedule(null);
          setNextScheduleError(false);
        } else {
          setNextScheduleError(true);
        }
      } finally {
        if (isMounted) {
          setNextScheduleLoading(false);
        }
      }
    }

    void loadNextSchedule();

    return () => {
      isMounted = false;
    };
  }, []);


  const nextScheduleValue = nextScheduleLoading
    ? "…"
    : nextScheduleError
      ? "—"
      : nextSchedule
        ? nextSchedule.subject
        : "Aucun cours";

  const nextScheduleDescription = nextScheduleLoading
    ? "Chargement du prochain cours."
    : nextScheduleError
      ? "Impossible de charger le prochain cours."
      : nextSchedule
        ? `${dayLabels[nextSchedule.dayOfWeek]} · ${nextSchedule.startTime} - ${nextSchedule.endTime}${nextSchedule.room ? ` · Salle ${nextSchedule.room}` : ""}`
        : "Aucun prochain cours prévu.";

  const sections: DashboardSectionData[] = [
    {
      id: "student-overview",
      title: "Ma scolarité",
      cards: [
        {
          id: "assignments",
          title: "Devoirs",
          value: assignmentsError ? "—" : assignmentCount === null ? "…" : String(assignmentCount),
          description: "Vos devoirs à venir.",
          onPress: () => router.push("/(app)/assignments"),
        },
        {
          id: "next-class",
          title: "Prochain cours",
          value: nextScheduleValue,
          description: nextScheduleDescription,
        },
      ],
    },
    {
      id: "student-activity",
      title: "Mon activité",
      cards: [
        {
          id: "schedule",
          title: "Emploi du temps",
          description: "Consulter vos cours et horaires.",
          onPress: () => router.push("/(app)/schedule"),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Espace étudiant</Text>
      <Text style={styles.subtitle}>
        Bonjour {firstName}, voici votre espace scolaire.
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
});
