import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getMyAssignments } from "../../../services/assignments/assignment.service";

type StudentDashboardProps = {
  firstName: string;
};

export function StudentDashboard({
  firstName,
}: StudentDashboardProps) {
  const router = useRouter();
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentsError, setAssignmentsError] = useState(false);

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
          value: "—",
          description: "Votre prochaine séance.",
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
        {
          id: "messages",
          title: "Messages",
          description: "Vos échanges avec l’établissement.",
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
});
