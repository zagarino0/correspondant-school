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

  const { counts, attendance, communication } = dashboard;

  return (
    <RoleDashboard
      firstName={firstName}
      title="Administration scolaire"
      subtitle="pilotez les activités de votre établissement."
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
              value: String(counts.classes),
              description: "Classes de l'année active.",
            },
            {
              id: "staff",
              title: "Personnel",
              value: String(counts.staff),
              description: "Affectations actives.",
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
    padding: 24,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
});
