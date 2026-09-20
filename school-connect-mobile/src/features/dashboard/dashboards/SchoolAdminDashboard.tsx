import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoleDashboard } from "./RoleDashboard";
import { getSchoolAdminDashboard } from "../../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse } from "../../../services/school-admin/school-admin.types";

type SchoolAdminDashboardProps = {
  firstName: string;
};

export function SchoolAdminDashboard({
  firstName,
}: SchoolAdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] =
    useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSchoolAdminDashboard();

        if (mounted) {
          setDashboard(data);
        }
      } catch {
        if (mounted) {
          setError(
            "Impossible de charger les indicateurs de l'établissement.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.stateText}>
          Chargement du tableau de bord...
        </Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorTitle}>Tableau de bord indisponible</Text>
        <Text style={styles.stateText}>
          {error ?? "Les données de l'établissement sont indisponibles."}
        </Text>
      </View>
    );
  }

  const { counts, attendance, classes, personnel } = dashboard;

  return (
    <RoleDashboard
      firstName={firstName}
      title="Administration de l'établissement"
      subtitle="Pilotez les effectifs, les classes, le personnel et le suivi des présences."
      sections={[
        {
          id: "school-management",
          title: "Vue d'ensemble",
          cards: [
            {
              id: "students",
              title: "Élèves",
              value: String(counts.students),
              description: "Élèves actifs cette année.",
              onPress: () => router.push("/(app)/students"),
            },
            {
              id: "teachers",
              title: "Enseignants",
              value: String(counts.teachers),
              description: "Enseignants actifs.",
              onPress: () => router.push("/(app)/teachers"),
            },
            {
              id: "classes",
              title: "Classes",
              value: String(classes.length),
              description:
                "Voir toutes les classes actives, regroupées par cycle.",
              onPress: () => router.push("/(app)/classes"),
            },
            {
              id: "staff",
              title: "Personnel",
              value: String(personnel.length),
              description:
                "Voir le personnel actif de l'établissement, regroupé par fonction.",
              onPress: () => router.push("/(app)/personnel"),
            },
          ],
        },
        {
          id: "quick-actions",
          title: "Ajouter",
          cards: [
            {
              id: "add-class",
              title: "Nouvelle classe",
              value: "+",
              description: "Créer une classe dans l'année active.",
              onPress: () => router.push("/(app)/class-create"),
            },
            {
              id: "add-personnel",
              title: "Nouveau personnel",
              value: "+",
              description: "Ajouter un membre du personnel.",
              onPress: () => router.push("/(app)/personnel-create"),
            },
            {
              id: "add-teacher",
              title: "Nouvel enseignant",
              value: "+",
              description: "Créer un compte enseignant.",
              onPress: () => router.push("/(app)/teacher-create"),
            },
          ],
        },
        {
          id: "daily-monitoring",
          title: "Suivi du jour",
          cards: [
            {
              id: "attendance",
              title: "Présences",
              value: String(attendance.recorded),
              description:
                `Présents ${attendance.present} · Absents ${attendance.absent} · Retards ${attendance.late} · Excusés ${attendance.excused}`,
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
});
