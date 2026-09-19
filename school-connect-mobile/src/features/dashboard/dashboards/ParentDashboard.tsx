import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardCardData, DashboardSectionData } from "../dashboard.types";
import { getMyChildren, type ParentChild } from "../../../services/parents/parent.service";

type ParentDashboardProps = {
  firstName: string;
};

export function ParentDashboard({ firstName }: ParentDashboardProps) {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
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
          description: selectedChild
            ? `Consulter les absences et retards de ${selectedChild.firstName}.`
            : "Sélectionnez un enfant pour consulter ses présences.",
        },
        {
          id: "results",
          title: "Résultats",
          description: selectedChild
            ? `Consulter les notes et résultats de ${selectedChild.firstName}.`
            : "Sélectionnez un enfant pour consulter ses résultats.",
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
