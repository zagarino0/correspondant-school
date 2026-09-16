import { ScrollView, StyleSheet, Text } from "react-native";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";

type StudentDashboardProps = {
  firstName: string;
};

export function StudentDashboard({
  firstName,
}: StudentDashboardProps) {
  const sections: DashboardSectionData[] = [
    {
      id: "student-overview",
      title: "Ma scolarité",
      cards: [
        {
          id: "assignments",
          title: "Devoirs",
          value: "—",
          description: "Vos devoirs à venir.",
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
